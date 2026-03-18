from fastapi import HTTPException
from sqlalchemy.orm import Session

from auth.security import hash_password, verify_password
from db import models


def authenticate_user(db: Session, student_id: str, password: str) -> models.Student:
    student = db.query(models.Student).filter(models.Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=401, detail="학번 또는 비밀번호가 올바르지 않습니다.")

    if student.password_hash is None:
        raise HTTPException(
            status_code=403,
            detail="비밀번호가 설정되지 않았습니다. 초기 비밀번호를 설정해주세요.",
            headers={"X-Password-Setup-Required": "true"},
        )

    if not verify_password(password, student.password_hash):
        raise HTTPException(status_code=401, detail="학번 또는 비밀번호가 올바르지 않습니다.")

    return student


def set_password(db: Session, student_pk: int, current_password: str | None, new_password: str) -> None:
    student = db.query(models.Student).filter(models.Student.student_pk == student_pk).first()
    if not student:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    if student.password_hash is not None:
        if current_password is None:
            raise HTTPException(status_code=400, detail="현재 비밀번호를 입력해주세요.")
        if not verify_password(current_password, student.password_hash):
            raise HTTPException(status_code=400, detail="현재 비밀번호가 올바르지 않습니다.")

    if len(new_password) < 4:
        raise HTTPException(status_code=400, detail="비밀번호는 4자 이상이어야 합니다.")

    student.password_hash = hash_password(new_password)
    db.commit()


def setup_initial_password(db: Session, student_id: str, new_password: str) -> models.Student:
    """비밀번호가 없는 사용자의 초기 비밀번호 설정"""
    student = db.query(models.Student).filter(models.Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="존재하지 않는 학번입니다.")

    if student.password_hash is not None:
        raise HTTPException(status_code=400, detail="이미 비밀번호가 설정되어 있습니다. 로그인해주세요.")

    if len(new_password) < 4:
        raise HTTPException(status_code=400, detail="비밀번호는 4자 이상이어야 합니다.")

    student.password_hash = hash_password(new_password)
    db.commit()
    db.refresh(student)
    return student
