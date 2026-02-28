from datetime import date
from fastapi import APIRouter
from services import schedules_service

router = APIRouter(prefix="/schedules", tags=["일정 관리"])


@router.get("/")
def get_schedules(schedule_id: int | None = None, cleaning_date: date | None = None):
    return schedules_service.get_schedules(schedule_id=schedule_id, cleaning_date=cleaning_date)


@router.post("/")
def add_schedule(start_date: date, end_date: date):
    return schedules_service.add_schedule(start_date=start_date, end_date=end_date)
