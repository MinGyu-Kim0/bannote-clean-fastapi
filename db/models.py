from __future__ import annotations

import os
from urllib.parse import quote_plus

from sqlalchemy import JSON, Column, Date, ForeignKey, Integer, String, create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker


def _build_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return database_url

    db_user = os.getenv("DB_USER")
    db_password = os.getenv("DB_PASSWORD")
    db_host = os.getenv("DB_HOST")
    db_name = os.getenv("DB_NAME")
    db_port = os.getenv("DB_PORT", "3306")

    if all([db_user, db_password, db_host, db_name]):
        encoded_password = quote_plus(db_password)
        return f"mysql+pymysql://{db_user}:{encoded_password}@{db_host}:{db_port}/{db_name}?charset=utf8mb4"

    return "mysql+pymysql://root:mysql@localhost/cleaning"


DATABASE_URL = _build_database_url()

engine = create_engine(
    DATABASE_URL,
    echo=os.getenv("SQLALCHEMY_ECHO", "false").lower() == "true",
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Student(Base):
    __tablename__ = "students"

    student_pk = Column(Integer, primary_key=True, autoincrement=True, index=True)
    student_id = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(50), nullable=False)
    grade = Column(Integer, nullable=False)
    status = Column(String(50), nullable=False, default="재학")
    role = Column(String(20), nullable=False, default="학생")
    password_hash = Column(String(128), nullable=True)


class Area(Base):
    __tablename__ = "areas"

    area_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    need_peoples = Column(Integer, nullable=False)
    target_grades = Column(JSON, nullable=False)


class Schedule(Base):
    __tablename__ = "schedules"

    schedule_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    cleaning_date = Column(Date, unique=True, nullable=False)
    status = Column(String(20), nullable=False, default="예정")


class Assignment(Base):
    __tablename__ = "assignments"

    assignment_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    schedule_id = Column(Integer, ForeignKey("schedules.schedule_id"), nullable=False)
    student_pk = Column(Integer, ForeignKey("students.student_pk"), nullable=False)
    area_id = Column(Integer, ForeignKey("areas.area_id"), nullable=False)
    status = Column(String(10), nullable=False, default="배정")


class Trade(Base):
    __tablename__ = "trades"

    request_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    requester_assignment_id = Column(Integer, ForeignKey("assignments.assignment_id"), nullable=False)
    target_assignment_id = Column(Integer, ForeignKey("assignments.assignment_id"), nullable=False)
    status = Column(String(10), nullable=False, default="대기")


def init_db() -> None:
    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    schedule_columns = {column["name"] for column in inspector.get_columns("schedules")}
    student_columns = {column["name"] for column in inspector.get_columns("students")}

    with engine.begin() as connection:
        if "status" not in schedule_columns:
            connection.execute(text("ALTER TABLE schedules ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT '예정'"))
        connection.execute(text("UPDATE schedules SET status = '예정' WHERE status IS NULL"))

        if "password_hash" not in student_columns:
            connection.execute(text("ALTER TABLE students ADD COLUMN password_hash VARCHAR(128)"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
