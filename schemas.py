from datetime import date
from typing import Literal

from pydantic import BaseModel


# --------pydantic 모델 정의--------


# 학생
class Student(BaseModel):
    student_pk: int  # 대리키(PK)
    student_id: str
    name: str
    grade: int
    status: str = "재학"
    role: str = "학생"


# 학생 정보 수정
class StudentUpdate(BaseModel):
    student_id: str | None = None
    name: str | None = None
    grade: int | None = None
    status: str | None = None
    role: str | None = None


# 청소 구역
class Area(BaseModel):
    area_id: int
    name: str
    need_peoples: int
    target_grades: list[int]


# 청소 구역 수정
class AreaUpdate(BaseModel):
    name: str | None = None
    need_peoples: int | None = None
    target_grades: list[int] | None = None


# 스케쥴
class Schedule(BaseModel):
    schedule_id: int
    cleaning_date: date


# 청소 배정
class Assignment(BaseModel):
    assignment_id: int
    schedule_id: int
    student_pk: int
    area_id: int
    status: str = "배정"


# 청소 교환
class Trade(BaseModel):
    request_id: int
    requester_assignment_id: int
    target_assignment_id: int
    status: Literal["대기", "수락", "거절", "취소"] = "대기"


class TradeCreate(BaseModel):
    requester_assignment_id: int
    target_assignment_id: int


class TradeUpdate(BaseModel):
    status: Literal["수락", "거절", "취소"]
