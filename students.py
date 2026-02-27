from fastapi import APIRouter
from services import students_service
from schemas import StudentUpdate

router = APIRouter(prefix="/students", tags=["학생 관리"])


# 학생 정보 조회 (GET)
@router.get("/")
def get_students(student_id: str = None, grade: int = None, name: str = None):
    return students_service.get_students(student_id=student_id, grade=grade, name=name)


# 학생 추가 (POST)
@router.post("/")
def add_student(student_pk: int, student_id: str, name: str, grade: int, status: str = "재학", role: str = "학생"):
    return students_service.add_student(
        student_pk=student_pk, student_id=student_id, name=name, grade=grade, status=status, role=role
    )


# 학생 정보 수정 (PATCH)
@router.patch("/{student_pk}")
def update_student(student_pk: int, update_data: StudentUpdate):
    return students_service.update_student(student_pk=student_pk, update_data=update_data)


# 학생 삭제 (DELETE)
@router.delete("/{student_pk}")
def delete_student(student_pk: int):
    return students_service.delete_student(student_pk=student_pk)
