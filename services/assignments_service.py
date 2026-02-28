import random

from fastapi import HTTPException

from db import areas_db, assignments_db, schedules_db, students_db
from schemas import Assignment

ALLOWED_STATUSES = {"배정", "완료", "취소", "추노"}


def _get_cleaning_count(student_pk: int) -> int:
    # 취소된 내역은 청소 횟수에서 제외
    return sum(1 for assignment in assignments_db if assignment.student_pk == student_pk and assignment.status != "취소")


def _build_fairness_counts() -> dict[int, int]:
    # 재학생 기준으로 현재까지 배정 횟수(취소 제외)를 집계
    fairness_counts = {student.student_pk: 0 for student in students_db if student.status == "재학"}
    for assignment in assignments_db:
        if assignment.status == "취소":
            continue
        if assignment.student_pk in fairness_counts:
            fairness_counts[assignment.student_pk] += 1
    return fairness_counts


def _pick_fair_random_student(candidates, fairness_counts: dict[int, int]):
    min_count = min(fairness_counts.get(student.student_pk, 0) for student in candidates)
    least_loaded_candidates = [
        student for student in candidates if fairness_counts.get(student.student_pk, 0) == min_count
    ]
    return random.choice(least_loaded_candidates)


def _create_initial_assignments_for_schedule(
    schedule_id: int,
    next_id: int,
    fairness_counts: dict[int, int],
) -> tuple[list[Assignment], int, list[dict]]:
    used_student_pks: set[int] = set()
    created_assignments: list[Assignment] = []
    unfilled_needs: list[dict] = []

    # 최소 배정 횟수 그룹 내에서 랜덤 선택해 쏠림을 줄이고, 동률은 랜덤으로 분산
    for area in sorted(areas_db, key=lambda x: x.area_id):
        required_count = area.need_peoples
        if required_count < 1:
            continue

        assigned_count = 0
        for _ in range(required_count):
            candidates = [
                student
                for student in students_db
                if student.status == "재학"
                and student.grade in area.target_grades
                and student.student_pk not in used_student_pks
            ]
            if not candidates:
                break

            selected_student = _pick_fair_random_student(candidates, fairness_counts)
            new_assignment = Assignment(
                assignment_id=next_id,
                schedule_id=schedule_id,
                student_pk=selected_student.student_pk,
                area_id=area.area_id,
                status="배정",
            )
            assignments_db.append(new_assignment)
            created_assignments.append(new_assignment)
            used_student_pks.add(selected_student.student_pk)
            fairness_counts[selected_student.student_pk] = fairness_counts.get(selected_student.student_pk, 0) + 1
            assigned_count += 1
            next_id += 1

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

    return created_assignments, next_id, unfilled_needs


# 배정표 조회
def get_assignments(
    assignment_id: int | None = None,
    schedule_id: int | None = None,
    student_pk: int | None = None,
    area_id: int | None = None,
    status: str | None = None,
):
    if assignment_id is not None:
        matched = [a for a in assignments_db if a.assignment_id == assignment_id]
        if not matched:
            raise HTTPException(status_code=404, detail="해당 배정이 존재하지 않습니다.")
        return matched

    matched = assignments_db

    if schedule_id is not None:
        matched = [a for a in matched if a.schedule_id == schedule_id]
    if student_pk is not None:
        matched = [a for a in matched if a.student_pk == student_pk]
    if area_id is not None:
        matched = [a for a in matched if a.area_id == area_id]
    if status is not None:
        matched = [a for a in matched if a.status == status]

    return matched


# 청소 배정 (생성된 전체 일정 일괄 배정)
def add_assignment():
    if not schedules_db:
        raise HTTPException(status_code=400, detail="생성된 일정이 없어 배정을 진행할 수 없습니다.")

    next_id = max((a.assignment_id for a in assignments_db), default=0) + 1
    total_created = 0
    created_results: list[dict] = []
    skipped_schedule_ids: list[int] = []
    total_unfilled_needs: list[dict] = []
    fairness_counts = _build_fairness_counts()

    for schedule in sorted(schedules_db, key=lambda x: x.schedule_id):
        if any(a.schedule_id == schedule.schedule_id for a in assignments_db):
            skipped_schedule_ids.append(schedule.schedule_id)
            continue

        created_assignments, next_id, unfilled_needs = _create_initial_assignments_for_schedule(
            schedule.schedule_id,
            next_id,
            fairness_counts,
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

    return {
        "message": "전체 일정 자동 배정이 완료되었습니다.",
        "created_schedule_count": len(created_results),
        "total_created_count": total_created,
        "results": created_results,
        "skipped_schedule_ids": skipped_schedule_ids,
        "total_unfilled_needs": total_unfilled_needs,
    }


# 청소 현황 수정
def update_assignment_status(assignment_id: int, status: str):
    assignment = next((a for a in assignments_db if a.assignment_id == assignment_id), None)
    if not assignment:
        raise HTTPException(status_code=404, detail="수정할 배정 정보를 찾을 수 없습니다.")

    if status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail="유효하지 않은 청소 현황 값입니다.")

    assignment.status = status
    return {"message": "청소 현황이 수정되었습니다.", "assignment": assignment}


def reassign_canceled_assignment(assignment_id: int):
    assignment = next((a for a in assignments_db if a.assignment_id == assignment_id), None)
    if not assignment:
        raise HTTPException(status_code=404, detail="재배정할 배정 정보를 찾을 수 없습니다.")

    if assignment.status != "취소":
        raise HTTPException(status_code=400, detail="취소된 배정만 재배정할 수 있습니다.")

    schedule = next((s for s in schedules_db if s.schedule_id == assignment.schedule_id), None)
    if not schedule:
        raise HTTPException(status_code=404, detail="연결된 일정이 존재하지 않습니다.")

    area = next((a for a in areas_db if a.area_id == assignment.area_id), None)
    if not area:
        raise HTTPException(status_code=404, detail="연결된 청소 구역이 존재하지 않습니다.")

    assigned_student_pks = {
        a.student_pk
        for a in assignments_db
        if a.schedule_id == assignment.schedule_id and a.status != "취소" and a.assignment_id != assignment.assignment_id
    }

    candidates = [
        student
        for student in students_db
        if student.status == "재학" and student.grade in area.target_grades and student.student_pk not in assigned_student_pks
    ]

    if not candidates:
        raise HTTPException(status_code=400, detail="재배정 가능한 학생이 없습니다.")

    selected_student = min(candidates, key=lambda x: (_get_cleaning_count(x.student_pk), x.student_pk))

    assignment.student_pk = selected_student.student_pk
    assignment.status = "배정"

    return {
        "message": "재배정이 완료되었습니다.",
        "assignment": assignment,
        "selected_student_cleaning_count": _get_cleaning_count(selected_student.student_pk),
    }


# 청소 일정 삭제
def delete_assignment(assignment_id: int):
    assignment = next((a for a in assignments_db if a.assignment_id == assignment_id), None)
    if not assignment:
        raise HTTPException(status_code=404, detail="삭제할 배정 정보를 찾을 수 없습니다.")

    assignments_db.remove(assignment)
    return {"message": "배정이 삭제되었습니다."}
