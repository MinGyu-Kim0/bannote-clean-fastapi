import random

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from db import models

ALLOWED_STATUSES = {"배정", "완료", "취소", "불이행"}
EXCLUDED_COUNT_STATUSES = {"취소", "불이행"}


def _get_assignment_or_404(db: Session, assignment_id: int):
    assignment = db.query(models.Assignment).filter(models.Assignment.assignment_id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="해당 배정을 찾을 수 없습니다.")
    return assignment


def _get_assignment_ids_for_schedule(db: Session, schedule_id: int) -> list[int]:
    return [
        assignment_id
        for (assignment_id,) in db.query(models.Assignment.assignment_id)
        .filter(models.Assignment.schedule_id == schedule_id)
        .all()
    ]


def _cancel_pending_trades_for_assignment_ids(db: Session, assignment_ids: list[int]) -> int:
    if not assignment_ids:
        return 0

    return (
        db.query(models.Trade)
        .filter(
            models.Trade.status == "대기",
            or_(
                models.Trade.requester_assignment_id.in_(assignment_ids),
                models.Trade.target_assignment_id.in_(assignment_ids),
            ),
        )
        .update({models.Trade.status: "취소"}, synchronize_session=False)
    )


def _delete_assignments_by_ids(db: Session, assignment_ids: list[int]) -> tuple[int, int]:
    if not assignment_ids:
        return 0, 0

    deleted_trade_count = (
        db.query(models.Trade)
        .filter(
            or_(
                models.Trade.requester_assignment_id.in_(assignment_ids),
                models.Trade.target_assignment_id.in_(assignment_ids),
            )
        )
        .delete(synchronize_session=False)
    )
    deleted_assignment_count = (
        db.query(models.Assignment)
        .filter(models.Assignment.assignment_id.in_(assignment_ids))
        .delete(synchronize_session=False)
    )

    return deleted_assignment_count, deleted_trade_count


def _load_assignment_metrics(db: Session) -> dict[int, dict[str, int]]:
    metrics: dict[int, dict[str, int]] = {}

    assignments = db.query(models.Assignment.student_pk, models.Assignment.status).all()
    for student_pk, status in assignments:
        student_metrics = metrics.setdefault(
            student_pk,
            {
                "cleaning_count": 0,
                "noncompliance_count": 0,
                "penalty_count": 0,
            },
        )

        if status not in EXCLUDED_COUNT_STATUSES:
            student_metrics["cleaning_count"] += 1
        if status == "불이행":
            student_metrics["noncompliance_count"] += 1
        if status in EXCLUDED_COUNT_STATUSES:
            student_metrics["penalty_count"] += 1

    return metrics


def _pick_reassign_student(candidates, metrics: dict[int, dict[str, int]]):
    # 취소/불이행 이력이 있는 학생이 있으면 우선, 없으면 전체 후보에서 랜덤 재배정
    metric_rows = [
        {
            "student": student,
            "penalty_count": metrics.get(student.student_pk, {}).get("penalty_count", 0),
            "noncompliance_count": metrics.get(student.student_pk, {}).get("noncompliance_count", 0),
            "cleaning_count": metrics.get(student.student_pk, {}).get("cleaning_count", 0),
        }
        for student in candidates
    ]

    prioritized = [metric for metric in metric_rows if metric["penalty_count"] > 0]
    if not prioritized:
        return random.choice(candidates)

    max_noncompliance_count = max(metric["noncompliance_count"] for metric in prioritized)
    noncompliance_top = [
        metric for metric in prioritized if metric["noncompliance_count"] == max_noncompliance_count
    ]

    max_penalty_count = max(metric["penalty_count"] for metric in noncompliance_top)
    penalty_top = [metric for metric in noncompliance_top if metric["penalty_count"] == max_penalty_count]

    min_cleaning_count = min(metric["cleaning_count"] for metric in penalty_top)
    least_loaded = [metric for metric in penalty_top if metric["cleaning_count"] == min_cleaning_count]

    return random.choice(least_loaded)["student"]


def _build_fairness_counts(db: Session) -> dict[int, int]:
    fairness_counts = {
        student.student_pk: 0
        for student in db.query(models.Student)
        .filter(models.Student.status == "재학")
        .order_by(models.Student.student_pk)
        .all()
    }

    metrics = _load_assignment_metrics(db)
    for student_pk in fairness_counts:
        fairness_counts[student_pk] = metrics.get(student_pk, {}).get("cleaning_count", 0)

    return fairness_counts


def _pick_fair_random_student(candidates, fairness_counts: dict[int, int]):
    min_count = min(fairness_counts.get(student.student_pk, 0) for student in candidates)
    least_loaded_candidates = [student for student in candidates if fairness_counts.get(student.student_pk, 0) == min_count]
    return random.choice(least_loaded_candidates)


def _create_initial_assignments_for_schedule(
    db: Session,
    schedule_id: int,
    fairness_counts: dict[int, int],
) -> tuple[list[models.Assignment], list[dict]]:
    used_student_pks: set[int] = set()
    created_assignments: list[models.Assignment] = []
    unfilled_needs: list[dict] = []

    areas = db.query(models.Area).order_by(models.Area.area_id).all()

    # 최소 배정 횟수 그룹 내에서 랜덤 선택해 쏠림을 줄이고, 동률은 랜덤으로 분산
    for area in areas:
        required_count = area.need_peoples or 0
        if required_count < 1:
            continue

        target_grades = area.target_grades or []
        assigned_count = 0

        for _ in range(required_count):
            candidates = (
                db.query(models.Student)
                .filter(models.Student.status == "재학", models.Student.grade.in_(target_grades))
                .order_by(models.Student.student_pk)
                .all()
            )
            candidates = [student for student in candidates if student.student_pk not in used_student_pks]

            if not candidates:
                break

            selected_student = _pick_fair_random_student(candidates, fairness_counts)
            assignment = models.Assignment(
                schedule_id=schedule_id,
                student_pk=selected_student.student_pk,
                area_id=area.area_id,
                status="배정",
            )
            db.add(assignment)
            db.flush()

            created_assignments.append(assignment)
            used_student_pks.add(selected_student.student_pk)
            fairness_counts[selected_student.student_pk] = fairness_counts.get(selected_student.student_pk, 0) + 1
            assigned_count += 1

        missing_count = required_count - assigned_count
        if missing_count > 0:
            unfilled_needs.append(
                {
                    "schedule_id": schedule_id,
                    "area_id": area.area_id,
                    "area_name": area.name,
                    "required_count": required_count,
                    "assigned_count": assigned_count,
                    "missing_count": missing_count,
                }
            )

    return created_assignments, unfilled_needs


def get_assignments(
    db: Session,
    assignment_id: int | None = None,
    schedule_id: int | None = None,
    student_pk: int | None = None,
    area_id: int | None = None,
    status: str | None = None,
):
    query = db.query(models.Assignment).order_by(models.Assignment.assignment_id)

    if assignment_id is not None:
        matched = query.filter(models.Assignment.assignment_id == assignment_id).all()
        if not matched:
            raise HTTPException(status_code=404, detail="해당 배정이 존재하지 않습니다.")
        return matched

    if schedule_id is not None:
        query = query.filter(models.Assignment.schedule_id == schedule_id)
    if student_pk is not None:
        query = query.filter(models.Assignment.student_pk == student_pk)
    if area_id is not None:
        query = query.filter(models.Assignment.area_id == area_id)
    if status is not None:
        query = query.filter(models.Assignment.status == status)

    return query.all()


def add_assignment(db: Session):
    schedules = (
        db.query(models.Schedule)
        .filter(models.Schedule.status == "예정")
        .order_by(models.Schedule.schedule_id)
        .all()
    )
    if not schedules:
        raise HTTPException(status_code=400, detail="배정 가능한 예정 일정이 없습니다.")

    existing_schedule_ids = {
        schedule_id
        for (schedule_id,) in db.query(models.Assignment.schedule_id).distinct().all()
    }

    total_created = 0
    created_results: list[dict] = []
    skipped_schedule_ids: list[int] = []
    total_unfilled_needs: list[dict] = []
    fairness_counts = _build_fairness_counts(db)

    for schedule in schedules:
        if schedule.schedule_id in existing_schedule_ids:
            skipped_schedule_ids.append(schedule.schedule_id)
            continue

        created_assignments, unfilled_needs = _create_initial_assignments_for_schedule(
            db=db,
            schedule_id=schedule.schedule_id,
            fairness_counts=fairness_counts,
        )
        if created_assignments:
            total_created += len(created_assignments)
            created_results.append(
                {
                    "schedule_id": schedule.schedule_id,
                    "created_count": len(created_assignments),
                    "assignments": created_assignments,
                    "unfilled_needs": unfilled_needs,
                }
            )
            total_unfilled_needs.extend(unfilled_needs)
        else:
            skipped_schedule_ids.append(schedule.schedule_id)
            total_unfilled_needs.extend(unfilled_needs)

    if total_created == 0:
        raise HTTPException(status_code=400, detail="배정 가능한 일정이 없습니다.")

    db.commit()

    return {
        "message": "전체 일정 자동 배정이 완료되었습니다.",
        "created_schedule_count": len(created_results),
        "total_created_count": total_created,
        "results": created_results,
        "skipped_schedule_ids": skipped_schedule_ids,
        "total_unfilled_needs": total_unfilled_needs,
    }


def update_assignment_status(db: Session, assignment_id: int, status: str):
    assignment = _get_assignment_or_404(db, assignment_id)

    if status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail="유효하지 않은 청소 현황 값입니다.")

    canceled_trade_count = 0
    assignment.status = status
    if status == "취소":
        canceled_trade_count = _cancel_pending_trades_for_assignment_ids(db, [assignment.assignment_id])
    db.commit()
    db.refresh(assignment)

    return {
        "message": "청소 현황이 수정되었습니다.",
        "assignment": assignment,
        "canceled_trade_count": canceled_trade_count,
    }


def reassign_canceled_assignment(db: Session, assignment_id: int):
    assignment = _get_assignment_or_404(db, assignment_id)

    if assignment.status != "취소":
        raise HTTPException(status_code=400, detail="취소된 배정만 재배정할 수 있습니다.")

    schedule = db.query(models.Schedule).filter(models.Schedule.schedule_id == assignment.schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="연결된 일정이 존재하지 않습니다.")

    area = db.query(models.Area).filter(models.Area.area_id == assignment.area_id).first()
    if not area:
        raise HTTPException(status_code=404, detail="연결된 청소 구역이 존재하지 않습니다.")

    assigned_student_pks = {
        student_pk
        for (student_pk,) in db.query(models.Assignment.student_pk)
        .filter(
            models.Assignment.schedule_id == assignment.schedule_id,
            models.Assignment.status != "취소",
            models.Assignment.assignment_id != assignment.assignment_id,
        )
        .all()
    }

    candidates = (
        db.query(models.Student)
        .filter(models.Student.status == "재학", models.Student.grade.in_(area.target_grades or []))
        .order_by(models.Student.student_pk)
        .all()
    )
    candidates = [student for student in candidates if student.student_pk not in assigned_student_pks]

    if not candidates:
        raise HTTPException(status_code=400, detail="재배정 가능한 학생이 없습니다.")

    metrics = _load_assignment_metrics(db)
    selected_student = _pick_reassign_student(candidates, metrics)

    assignment.student_pk = selected_student.student_pk
    assignment.status = "배정"
    db.commit()
    db.refresh(assignment)

    return {
        "message": "재배정이 완료되었습니다.",
        "assignment": assignment,
        "selected_student_cleaning_count": metrics.get(selected_student.student_pk, {}).get("cleaning_count", 0) + 1,
    }


def delete_assignment(db: Session, assignment_id: int):
    _get_assignment_or_404(db, assignment_id)
    deleted_assignment_count, deleted_trade_count = _delete_assignments_by_ids(db, [assignment_id])
    db.commit()

    return {
        "message": "배정이 삭제되었습니다.",
        "deleted_assignment_count": deleted_assignment_count,
        "deleted_trade_count": deleted_trade_count,
    }


def delete_assignments(db: Session, schedule_id: int | None = None):
    if schedule_id is not None:
        schedule = db.query(models.Schedule).filter(models.Schedule.schedule_id == schedule_id).first()
        if not schedule:
            raise HTTPException(status_code=404, detail="해당 일정이 존재하지 않습니다.")
        assignment_ids = _get_assignment_ids_for_schedule(db, schedule_id)
    else:
        assignment_ids = [
            assignment_id
            for (assignment_id,) in db.query(models.Assignment.assignment_id).order_by(models.Assignment.assignment_id).all()
        ]

    deleted_assignment_count, deleted_trade_count = _delete_assignments_by_ids(db, assignment_ids)
    db.commit()

    return {
        "message": "배정이 일괄 삭제되었습니다.",
        "schedule_id": schedule_id,
        "deleted_assignment_count": deleted_assignment_count,
        "deleted_trade_count": deleted_trade_count,
    }
