from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from auth.security import decode_access_token
from db.models import Student, get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Student:
    try:
        payload = decode_access_token(token)
        student_pk: int = payload.get("sub")
        if student_pk is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[AUTH DEBUG] token decode failed: {type(e).__name__}: {e}")
        print(f"[AUTH DEBUG] token (first 50 chars): {token[:50] if token else 'None'}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")

    user = db.query(Student).filter(Student.student_pk == student_pk).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="사용자를 찾을 수 없습니다.")
    return user


def require_admin(current_user: Student = Depends(get_current_user)) -> Student:
    if current_user.role != "관리자":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="관리자 권한이 필요합니다.")
    return current_user
