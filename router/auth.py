from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from auth.security import create_access_token
from db.models import Student, get_db
from db.schemas import LoginRequest, SetPasswordRequest, TokenResponse
from services import auth_service

router = APIRouter(prefix="/auth", tags=["인증"])


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    student = auth_service.authenticate_user(db, payload.student_id, payload.password)
    token = create_access_token({"sub": student.student_pk, "role": student.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "student_pk": student.student_pk,
            "student_id": student.student_id,
            "name": student.name,
            "grade": student.grade,
            "role": student.role,
            "status": student.status,
        },
    }


@router.post("/setup-password")
def setup_password(payload: LoginRequest, db: Session = Depends(get_db)):
    """첫 로그인 시 비밀번호 설정 (password_hash가 null인 사용자)"""
    student = auth_service.setup_initial_password(db, payload.student_id, payload.password)
    token = create_access_token({"sub": student.student_pk, "role": student.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "student_pk": student.student_pk,
            "student_id": student.student_id,
            "name": student.name,
            "grade": student.grade,
            "role": student.role,
            "status": student.status,
        },
    }


@router.get("/me")
def get_me(current_user: Student = Depends(get_current_user)):
    return {
        "student_pk": current_user.student_pk,
        "student_id": current_user.student_id,
        "name": current_user.name,
        "grade": current_user.grade,
        "role": current_user.role,
        "status": current_user.status,
    }


@router.post("/set-password")
def set_password(
    payload: SetPasswordRequest,
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    auth_service.set_password(db, current_user.student_pk, payload.current_password, payload.new_password)
    return {"message": "비밀번호가 변경되었습니다."}
