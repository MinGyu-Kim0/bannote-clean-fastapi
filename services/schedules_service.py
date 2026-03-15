from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from db import models, schemas
from services import assignments_service

ALLOWED_SCHEDULE_STATUSES = {"예정", "완료", "취소"}


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


def add_schedule(db: Session, start_date: date, end_date: date):
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="시작일은 종료일보다 늦을 수 없습니다.")

    friday_dates: list[date] = []
    current = start_date
    while current <= end_date:
        if current.weekday() == 4:
            friday_dates.append(current)
        current += timedelta(days=1)

    if not friday_dates:
        raise HTTPException(status_code=400, detail="해당 기간에 금요일 일정이 없습니다.")

    existing_dates = {
        cleaning_date
        for (cleaning_date,) in db.query(models.Schedule.cleaning_date)
        .filter(models.Schedule.cleaning_date.in_(friday_dates))
        .all()
    }

    created_schedules: list[models.Schedule] = []
    for target_date in friday_dates:
        if target_date in existing_dates:
            continue

        schedule = models.Schedule(cleaning_date=target_date, status="예정")
        db.add(schedule)
        created_schedules.append(schedule)

    if not created_schedules:
        raise HTTPException(status_code=400, detail="해당 기간의 금요일 일정이 이미 모두 등록되어 있습니다.")

    db.commit()
    for schedule in created_schedules:
        db.refresh(schedule)

    return {
        "message": "청소 일정이 생성되었습니다.",
        "created_count": len(created_schedules),
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
        "message": "일정이 수정되었습니다.",
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
        "message": "일정이 삭제되었습니다.",
        "deleted_assignment_count": deleted_assignment_count,
        "deleted_trade_count": deleted_trade_count,
    }
