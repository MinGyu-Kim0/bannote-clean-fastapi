from fastapi import HTTPException
from sqlalchemy.orm import Session

from db import models, schemas

CANCELABLE_ASSIGNMENT_STATUSES = ("배정", "불이행")


def get_students(
    db: Session,
    student_id: str | None = None,
    grade: int | None = None,
    name: str | None = None,
):
    query = db.query(models.Student).order_by(models.Student.student_pk)

    if student_id is not None:
        matched = query.filter(models.Student.student_id == student_id).all()
        if not matched:
            raise HTTPException(status_code=404, detail="존재하지 않는 학번입니다.")
        return matched

    if name is not None:
        matched = query.filter(models.Student.name == name).all()
        if not matched:
            raise HTTPException(status_code=404, detail=f"학생({name})이 존재하지 않습니다.")
        return matched

    if grade is not None:
        return query.filter(models.Student.grade == grade).all()

    return query.all()


def add_student(
    db: Session,
    student_id: str,
    name: str,
    grade: int,
    status: str = "재학",
    role: str = "학생",
):
    duplicate_student_id = db.query(models.Student).filter(models.Student.student_id == student_id).first()
    if duplicate_student_id:
        raise HTTPException(status_code=400, detail="이미 존재하는 학생입니다.")

    student = models.Student(
        student_id=student_id,
        name=name,
        grade=grade,
        status=status,
        role=role,
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    return {
        "message": f"{name} 학생({student_id})이 추가되었습니다.",
        "student_id": student_id,
        "student": student,
    }


def update_student(db: Session, student_pk: int, update_data: schemas.StudentUpdate):
    student = db.query(models.Student).filter(models.Student.student_pk == student_pk).first()
    if not student:
        raise HTTPException(status_code=404, detail="학생을 찾을 수 없습니다.")

    previous_status = student.status
    update_dict = update_data.model_dump(exclude_unset=True, exclude_none=True)

    if "student_id" in update_dict:
        existing_student = (
            db.query(models.Student)
            .filter(models.Student.student_id == update_dict["student_id"], models.Student.student_pk != student_pk)
            .first()
        )
        if existing_student:
            raise HTTPException(status_code=400, detail="해당 정보로 수정할 수 없습니다.")

    for key, value in update_dict.items():
        setattr(student, key, value)

    canceled_assignment_ids: list[int] = []
    if previous_status != "휴학" and student.status == "휴학":
        assignments = (
            db.query(models.Assignment)
            .filter(
                models.Assignment.student_pk == student_pk,
                models.Assignment.status.in_(CANCELABLE_ASSIGNMENT_STATUSES),
            )
            .all()
        )
        for assignment in assignments:
            assignment.status = "취소"
            canceled_assignment_ids.append(assignment.assignment_id)

    db.commit()
    db.refresh(student)

    return {
        "message": "학생 정보가 수정되었습니다.",
        "student": student,
        "canceled_assignments": canceled_assignment_ids,
    }


def delete_student(db: Session, student_pk: int):
    student = db.query(models.Student).filter(models.Student.student_pk == student_pk).first()
    if not student:
        raise HTTPException(status_code=404, detail=f"{student_pk}번 학생을 찾을 수 없습니다.")

    linked_assignment = db.query(models.Assignment).filter(models.Assignment.student_pk == student_pk).first()
    if linked_assignment:
        raise HTTPException(status_code=400, detail="배정 이력이 있는 학생은 삭제할 수 없습니다.")

    db.delete(student)
    db.commit()

    return {"message": "삭제되었습니다."}
