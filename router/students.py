from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db.models import get_db
from db.schemas import StudentCreate, StudentUpdate
from services import students_service

router = APIRouter(prefix="/students", tags=["학생 관리"])


@router.get("/")
def get_students(
    student_id: str | None = None,
    grade: int | None = None,
    name: str | None = None,
    db: Session = Depends(get_db),
):
    return students_service.get_students(db=db, student_id=student_id, grade=grade, name=name)


@router.post("/")
def add_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
):
    return students_service.add_student(
        db=db,
        student_id=payload.student_id,
        name=payload.name,
        grade=payload.grade,
        status=payload.status,
        role=payload.role,
    )


@router.patch("/{student_pk}")
def update_student(student_pk: int, update_data: StudentUpdate, db: Session = Depends(get_db)):
    return students_service.update_student(db=db, student_pk=student_pk, update_data=update_data)


@router.delete("/{student_pk}")
def delete_student(student_pk: int, db: Session = Depends(get_db)):
    return students_service.delete_student(db=db, student_pk=student_pk)
