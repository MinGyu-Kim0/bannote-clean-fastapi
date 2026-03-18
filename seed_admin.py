"""초기 관리자 계정 생성 스크립트

사용법: python seed_admin.py
"""
from auth.security import hash_password
from db.models import SessionLocal, Student, init_db

ADMIN_STUDENT_ID = "admin"
ADMIN_NAME = "관리자"
ADMIN_PASSWORD = "1234"
ADMIN_GRADE = 0

init_db()
db = SessionLocal()

existing = db.query(Student).filter(Student.student_id == ADMIN_STUDENT_ID).first()
if existing:
    print(f"이미 존재합니다: student_id={existing.student_id}, role={existing.role}")
    if existing.password_hash is None:
        existing.password_hash = hash_password(ADMIN_PASSWORD)
        db.commit()
        print(f"비밀번호가 설정되었습니다. (비밀번호: {ADMIN_PASSWORD})")
    else:
        print("비밀번호가 이미 설정되어 있습니다.")
else:
    admin = Student(
        student_id=ADMIN_STUDENT_ID,
        name=ADMIN_NAME,
        grade=ADMIN_GRADE,
        status="재학",
        role="관리자",
        password_hash=hash_password(ADMIN_PASSWORD),
    )
    db.add(admin)
    db.commit()
    print(f"관리자 계정이 생성되었습니다.")
    print(f"  학번: {ADMIN_STUDENT_ID}")
    print(f"  비밀번호: {ADMIN_PASSWORD}")
    print(f"  (로그인 후 비밀번호를 변경하세요)")

db.close()
