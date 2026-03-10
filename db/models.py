from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, JSON, Date, ForeignKey, create_engine
from sqlalchemy.ext.declarative import declarative_base

DATABASE_URL = "mysql+pymysql://root:mysql@localhost/cleaning"

engine = create_engine(DATABASE_URL)

# SQLAlchemy의 모델 기본 클래스 선언. 해당 클래스를 상속받아 데이터베이스 테이블을 정의한다.
Base = declarative_base()


class Student(Base):
    # 'students' 테이블 정의
    __tablename__ = "students"
    # 각 열(column) 정의.
    student_pk = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String(10), unique=True, index=True)
    name = Column(String(50))
    grade = Column(Integer)
    status = Column(String(50))
    role = Column(String(20), default="학생")


class Area(Base):
    __tablename__ = "areas"

    area_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True)
    need_peoples = Column(Integer)
    target_grades = Column(JSON)


class Schedule(Base):
    __tablename__ = "schedules"

    schedule_id = Column(Integer, primary_key=True, autoincrement=True)
    cleaning_date = Column(Date, unique=True)


class Assignment(Base):
    __tablename__ = "assignments"

    assignment_id = Column(Integer, primary_key=True, autoincrement=True)
    schedule_id = Column(Integer, ForeignKey("schedules.schedule_id"))
    student_pk = Column(Integer, ForeignKey("students.student_pk"))
    area_id = Column(Integer, ForeignKey("areas.area_id"))
    status = Column(String(10), default="배정")


class Trade(Base):
    __tablename__ = "trades"

    request_id = Column(Integer, primary_key=True, autoincrement=True)
    requester_assignment_id = Column(Integer, ForeignKey("assignments.assignment_id"))
    target_assignment_id = Column(Integer, ForeignKey("assignments.assignment_id"))
    status = Column(String(10), default="대기")


def get_db():
    db = Session(bind=engine)
    try:
        yield db
    finally:
        db.close()


Base.metadata.create_all(bind=engine)
