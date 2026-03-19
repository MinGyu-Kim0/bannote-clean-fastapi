from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from db import models, schemas
from services import assignments_service

ALLOWED_SCHEDULE_STATUSES = {"예정", "완료", "취소"}
WEEKDAY_LABELS = {
    0: "월요일",
    1: "화요일",
    2: "수요일",
    3: "목요일",
    4: "금요일",
}


def _get_schedule_or_404(db: Session, schedule_id: int):
    schedule = db.query(models.Schedule).filter(models.Schedule.schedule_id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="해당 일정이 존재하지 않습니다.")
    return schedule


def get_schedules(
    db: Session,
    schedule_id: int | None = None,
    cleaning_date: date | None = None,
    status: str | None = None,
):
    query = db.query(models.Schedule).order_by(models.Schedule.schedule_id)

    if schedule_id is not None:
        matched = query.filter(models.Schedule.schedule_id == schedule_id).all()
        if not matched:
            raise HTTPException(status_code=404, detail="해당 일정이 존재하지 않습니다.")
        return matched

    if cleaning_date is not None:
        matched = query.filter(models.Schedule.cleaning_date == cleaning_date).all()
        if not matched:
            raise HTTPException(status_code=404, detail="해당 날짜 일정이 존재하지 않습니다.")
        return matched

    if status is not None:
        query = query.filter(models.Schedule.status == status)

    return query.all()


def _normalize_schedule_weekdays(weekdays: list[int]) -> list[int]:
    normalized = sorted(set(weekdays))

    if not normalized:
        raise HTTPException(status_code=400, detail="요일을 1개 이상 선택해주세요.")

    invalid_weekdays = [weekday for weekday in normalized if weekday not in WEEKDAY_LABELS]
    if invalid_weekdays:
        raise HTTPException(status_code=400, detail="요일은 월요일부터 금요일까지(0~4)만 선택할 수 있습니다.")

    return normalized


def _format_schedule_weekdays(weekdays: list[int]) -> str:
    return ", ".join(WEEKDAY_LABELS[weekday] for weekday in weekdays)


def add_schedule(db: Session, start_date: date, end_date: date, weekdays: list[int]):
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="시작일이 종료일보다 늦을 수 없습니다.")

    normalized_weekdays = _normalize_schedule_weekdays(weekdays)
    weekday_text = _format_schedule_weekdays(normalized_weekdays)
    selected_weekdays = set(normalized_weekdays)

    matching_dates: list[date] = []
    current = start_date
    while current <= end_date:
        if current.weekday() in selected_weekdays:
            matching_dates.append(current)
        current += timedelta(days=1)

    if not matching_dates:
        raise HTTPException(
            status_code=400,
            detail=f"해당 기간에 선택한 요일({weekday_text}) 일정이 없습니다.",
        )

    existing_dates = {
        s.cleaning_date
        for s in db.query(models.Schedule)
        .filter(
            models.Schedule.cleaning_date >= start_date,
            models.Schedule.cleaning_date <= end_date,
        )
        .all()
    }

    created_schedules: list[models.Schedule] = []
    for target_date in matching_dates:
        if target_date in existing_dates:
            continue

        schedule = models.Schedule(cleaning_date=target_date, status="예정")
        db.add(schedule)
        created_schedules.append(schedule)

    if not created_schedules:
        raise HTTPException(
            status_code=400,
            detail=f"해당 기간의 선택한 요일({weekday_text}) 일정이 이미 모두 등록되어 있습니다.",
        )

    db.commit()
    for schedule in created_schedules:
        db.refresh(schedule)

    return {
        "message": f"선택한 요일({weekday_text}) 일정이 생성되었습니다.",
        "created_count": len(created_schedules),
        "weekdays": normalized_weekdays,
        "schedules": created_schedules,
    }


def update_schedule(db: Session, schedule_id: int, update_data: schemas.ScheduleUpdate):
    schedule = _get_schedule_or_404(db, schedule_id)

    if update_data.status is not None and update_data.status not in ALLOWED_SCHEDULE_STATUSES:
        raise HTTPException(status_code=400, detail="유효하지 않은 일정 상태 값입니다.")

    if update_data.cleaning_date is not None:
        duplicate_schedule = (
            db.query(models.Schedule)
            .filter(
                models.Schedule.cleaning_date == update_data.cleaning_date,
                models.Schedule.schedule_id != schedule_id,
            )
            .first()
        )
        if duplicate_schedule:
            raise HTTPException(status_code=400, detail="해당 날짜 일정이 이미 존재합니다.")

    previous_status = schedule.status
    if update_data.cleaning_date is not None:
        schedule.cleaning_date = update_data.cleaning_date
    if update_data.status is not None:
        schedule.status = update_data.status

    canceled_assignment_count = 0
    canceled_trade_count = 0
    if previous_status != "취소" and schedule.status == "취소":
        assignment_ids = assignments_service._get_assignment_ids_for_schedule(db, schedule_id)
        canceled_assignment_count = (
            db.query(models.Assignment)
            .filter(
                models.Assignment.schedule_id == schedule_id,
                models.Assignment.status != "취소",
            )
            .update({models.Assignment.status: "취소"}, synchronize_session=False)
        )
        canceled_trade_count = assignments_service._cancel_pending_trades_for_assignment_ids(db, assignment_ids)

    db.commit()
    db.refresh(schedule)

    return {
        "message": "일정을 수정했습니다.",
        "schedule": schedule,
        "canceled_assignment_count": canceled_assignment_count,
        "canceled_trade_count": canceled_trade_count,
    }


def delete_schedule(db: Session, schedule_id: int):
    schedule = _get_schedule_or_404(db, schedule_id)
    assignment_ids = assignments_service._get_assignment_ids_for_schedule(db, schedule_id)
    deleted_assignment_count, deleted_trade_count = assignments_service._delete_assignments_by_ids(db, assignment_ids)

    db.delete(schedule)
    db.commit()

    return {
        "message": "일정을 삭제했습니다.",
        "deleted_assignment_count": deleted_assignment_count,
        "deleted_trade_count": deleted_trade_count,
    }


def delete_all_schedules(db: Session):
    assignment_ids = [
        assignment_id
        for (assignment_id,) in db.query(models.Assignment.assignment_id).all()
    ]
    deleted_assignment_count, deleted_trade_count = assignments_service._delete_assignments_by_ids(db, assignment_ids)
    deleted_schedule_count = db.query(models.Schedule).delete(synchronize_session=False)
    db.commit()

    return {
        "message": "전체 일정이 삭제되었습니다.",
        "deleted_schedule_count": deleted_schedule_count,
        "deleted_assignment_count": deleted_assignment_count,
        "deleted_trade_count": deleted_trade_count,
    }
