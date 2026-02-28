from datetime import date, timedelta

from fastapi import HTTPException

from db import schedules_db
from schemas import Schedule


def get_schedules(schedule_id: int | None = None, cleaning_date: date | None = None):
    if schedule_id is not None:
        matched = [s for s in schedules_db if s.schedule_id == schedule_id]
        if not matched:
            raise HTTPException(status_code=404, detail="해당 일정이 존재하지 않습니다.")
        return matched

    if cleaning_date is not None:
        matched = [s for s in schedules_db if s.cleaning_date == cleaning_date]
        if not matched:
            raise HTTPException(status_code=404, detail="해당 날짜 일정이 존재하지 않습니다.")
        return matched

    return schedules_db


def add_schedule(start_date: date, end_date: date):
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="시작일은 종료일보다 늦을 수 없습니다.")

    # 금요일(weekday == 4) 날짜만 추출
    friday_dates: list[date] = []
    current = start_date
    while current <= end_date:
        if current.weekday() == 4:
            friday_dates.append(current)
        current += timedelta(days=1)

    existing_dates = {s.cleaning_date for s in schedules_db}
    next_id = max((s.schedule_id for s in schedules_db), default=0) + 1
    created_schedules: list[Schedule] = []

    for target_date in friday_dates:
        if target_date in existing_dates:
            continue
        new_schedule = Schedule(schedule_id=next_id, cleaning_date=target_date)
        schedules_db.append(new_schedule)
        created_schedules.append(new_schedule)
        existing_dates.add(target_date)
        next_id += 1

    if not created_schedules:
        raise HTTPException(status_code=400, detail="해당 기간의 금요일 일정이 이미 모두 등록되어 있습니다.")

    return {
        "message": "청소 일정이 생성되었습니다.",
        "created_count": len(created_schedules),
        "schedules": created_schedules,
    }
