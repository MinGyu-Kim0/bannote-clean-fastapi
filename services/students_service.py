from fastapi import HTTPException
from schemas import Student, StudentUpdate
from db import assignments_db, students_db


# 학생 조회(GET)
def get_students(student_id: str = None, grade: int = None, name: str = None):

    # 학번으로 조회
    if student_id:
        matched = [s for s in students_db if s.student_id == student_id]
        if not matched:
            raise HTTPException(status_code=404, detail=f"존재하지 않는 학번입니다.")
        return matched

    # 이름으로 조회
    if name:
        matched = [s for s in students_db if s.name == name]
        if not matched:
            raise HTTPException(status_code=404, detail=f"학생({name})이 존재하지 않습니다.")
        return matched

    # 학년별 조회
    if grade:
        return [s for s in students_db if s.grade == grade]

    # 전체 조회
    return students_db


# 학생 추가(POST)
def add_student(student_pk: int, student_id: str, name: str, grade: int, status: str = "재학", role: str = "학생"):

    new_student = Student(
        student_pk=student_pk,
        student_id=student_id,
        name=name,
        grade=grade,
        status=status,
        role=role,
    )

    for s in students_db:
        if s.student_pk == student_pk:
            raise HTTPException(status_code=400, detail="이미 존재하는 학생입니다.")

    for s in students_db:
        if s.student_id == student_id:
            raise HTTPException(status_code=400, detail="이미 존재하는 학생입니다.")

    students_db.append(new_student)

    return {
        "message": f"{name} 학생({student_id})이 추가되었습니다.",
        "student_id": student_id,
    }


# 학생 정보 수정(PATCH)
def update_student(student_pk: int, update_data: StudentUpdate):
    student = next((s for s in students_db if s.student_pk == student_pk), None)
    if not student:
        raise HTTPException(status_code=404, detail="학생을 찾을 수 없습니다.")

    previous_status = student.status
    update_dict = update_data.model_dump(exclude_unset=True)

    if "student_id" in update_dict:
        new_id = update_dict["student_id"]
        if any(s.student_id == new_id and s.student_pk != student_pk for s in students_db):
            raise HTTPException(status_code=400, detail="해당 정보로 수정할 수 없습니다.")

    for key, value in update_dict.items():
        setattr(student, key, value)

    canceled_assignment_ids: list[int] = []
    if previous_status != "휴학" and student.status == "휴학":
        for assignment in assignments_db:
            if assignment.student_pk == student_pk and assignment.status in {"배정", "추노"}:
                assignment.status = "취소"
                canceled_assignment_ids.append(assignment.assignment_id)

    return {
        "message": "학생 정보가 수정되었습니다.",
        "student": student,
        "canceled_assignments": canceled_assignment_ids,
    }


# 학생 삭제(DELETE)
def delete_student(student_pk: int):
    student = next((s for s in students_db if s.student_pk == student_pk), None)
    if not student:
        raise HTTPException(status_code=404, detail=f"{student_pk}번 학생을 찾을 수 없습니다.")

    else:
        students_db.remove(student)

    return {"message": f"삭제되었습니다."}
