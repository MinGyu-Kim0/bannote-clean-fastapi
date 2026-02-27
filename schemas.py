from pydantic import BaseModel
from typing import List, Optional
from datetime import date


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
    student_id: Optional[str] = None
    name: Optional[str] = None
    grade: Optional[int] = None
    status: Optional[str] = None
    role: Optional[str] = None


# 청소 구역
class Area(BaseModel):
    area_id: int
    name: str
    target_grades: List[int]


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
    status: str = "대기"
