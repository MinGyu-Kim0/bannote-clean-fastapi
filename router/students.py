from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user, require_admin
from db.models import Student, get_db
from db.schemas import StudentCreate, StudentUpdate
from services import students_service

router = APIRouter(prefix="/students", tags=["학생 관리"])


@router.get("/names")
def get_student_names(
    db: Session = Depends(get_db),
    _: Student = Depends(get_current_user),
):
    """모든 학생의 PK와 이름만 반환 (일반 유저도 접근 가능)"""
    students = db.query(Student.student_pk, Student.name).all()
    return {s.student_pk: s.name for s in students}


@router.get("/")
def get_students(
    student_id: str | None = None,
    grade: int | None = None,
    name: str | None = None,
    db: Session = Depends(get_db),
    _: Student = Depends(require_admin),
):
    return students_service.get_students(db=db, student_id=student_id, grade=grade, name=name)


@router.post("/")
def add_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    _: Student = Depends(require_admin),
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
def update_student(
    student_pk: int,
    update_data: StudentUpdate,
    db: Session = Depends(get_db),
    _: Student = Depends(require_admin),
):
    return students_service.update_student(db=db, student_pk=student_pk, update_data=update_data)


@router.delete("/{student_pk}")
def delete_student(
    student_pk: int,
    db: Session = Depends(get_db),
    _: Student = Depends(require_admin),
):
    return students_service.delete_student(db=db, student_pk=student_pk)
