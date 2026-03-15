from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from db.models import get_db
from services import assignments_service

router = APIRouter(prefix="/assignments", tags=["청소 배정 관리"])


@router.get("/")
def get_assignments(
    assignment_id: int | None = Query(default=None),
    schedule_id: int | None = Query(default=None),
    student_pk: int | None = Query(default=None),
    area_id: int | None = Query(default=None),
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return assignments_service.get_assignments(
        db=db,
        assignment_id=assignment_id,
        schedule_id=schedule_id,
        student_pk=student_pk,
        area_id=area_id,
        status=status,
    )


@router.post("/")
def add_assignment(db: Session = Depends(get_db)):
    return assignments_service.add_assignment(db=db)


@router.delete("/")
def delete_assignments(
    schedule_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return assignments_service.delete_assignments(db=db, schedule_id=schedule_id)


@router.patch("/{assignment_id}/status")
def update_assignment_status(assignment_id: int, status: str = Query(...), db: Session = Depends(get_db)):
    return assignments_service.update_assignment_status(db=db, assignment_id=assignment_id, status=status)


@router.post("/{assignment_id}/reassign")
def reassign_canceled_assignment(assignment_id: int, db: Session = Depends(get_db)):
    return assignments_service.reassign_canceled_assignment(db=db, assignment_id=assignment_id)


@router.delete("/{assignment_id}")
def delete_assignment(assignment_id: int, db: Session = Depends(get_db)):
    return assignments_service.delete_assignment(db=db, assignment_id=assignment_id)
