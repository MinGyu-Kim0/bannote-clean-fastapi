from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user, require_admin
from db.models import Student, get_db
from db.schemas import ScheduleUpdate
from services import schedules_service

router = APIRouter(prefix="/schedules", tags=["일정 관리"])


@router.get("/")
def get_schedules(
    schedule_id: int | None = None,
    cleaning_date: date | None = None,
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: Student = Depends(get_current_user),
):
    return schedules_service.get_schedules(
        db=db,
        schedule_id=schedule_id,
        cleaning_date=cleaning_date,
        status=status,
    )


@router.post("/")
def add_schedule(
    start_date: date,
    end_date: date,
    weekdays: list[int] = Query(..., description="0=월요일, 1=화요일, 2=수요일, 3=목요일, 4=금요일"),
    db: Session = Depends(get_db),
    _: Student = Depends(require_admin),
):
    return schedules_service.add_schedule(
        db=db,
        start_date=start_date,
        end_date=end_date,
        weekdays=weekdays,
    )


@router.patch("/{schedule_id}")
def update_schedule(
    schedule_id: int,
    update_data: ScheduleUpdate,
    db: Session = Depends(get_db),
    _: Student = Depends(require_admin),
):
    return schedules_service.update_schedule(db=db, schedule_id=schedule_id, update_data=update_data)


@router.delete("/")
def delete_all_schedules(
    db: Session = Depends(get_db),
    _: Student = Depends(require_admin),
):
    return schedules_service.delete_all_schedules(db=db)


@router.delete("/{schedule_id}")
def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    _: Student = Depends(require_admin),
):
    return schedules_service.delete_schedule(db=db, schedule_id=schedule_id)
