from fastapi import APIRouter

router = APIRouter(prefix="/students", tags=["학생 관리"])


# 학생 정보 조회 (GET)
@router.get("/")
def get_students():
    return {"message": "조회"}


# 학생 추가 (POST)
@router.post("/")
def add_student():
    return {"message": "추가"}


# 학생 정보 수정 (PATCH)
@router.patch("/{student_id}")
def update_student(student_id: str):
    return {"message": f"{student_id} 수정"}


# 학생 삭제 (DELETE)
@router.delete("/{student_id}")
def delete_student(student_id: str):
    return {"message": f"{student_id} 삭제"}
