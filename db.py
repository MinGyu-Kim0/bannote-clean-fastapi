from schemas import Student, Area, Schedule, Assignment, Trade
from typing import List

# 학생 데이터
students_db = [
    # --- 1학년 ---
    Student(student_id="261001", name="김철수", grade=1, status="재학", role="학생"),
    Student(student_id="261002", name="박민지", grade=1, status="재학", role="학생"),
    Student(student_id="261003", name="이진우", grade=1, status="재학", role="반대"),
    Student(student_id="261004", name="최서연", grade=1, status="재학", role="부반대"),
    Student(student_id="261005", name="정태양", grade=1, status="휴학", role="학생"),
    Student(student_id="261006", name="강하늘", grade=1, status="재학", role="학생"),
    Student(student_id="261007", name="윤도현", grade=1, status="재학", role="학생"),
    Student(student_id="261008", name="한소희", grade=1, status="재학", role="학생"),
    Student(student_id="261009", name="임준호", grade=1, status="재학", role="학생"),
    Student(student_id="261010", name="송지효", grade=1, status="재학", role="학생"),
    # --- 2학년 ---
    Student(student_id="252001", name="조성모", grade=2, status="재학", role="학생"),
    Student(student_id="252002", name="배수지", grade=2, status="재학", role="부반대"),
    Student(student_id="252003", name="남주혁", grade=2, status="재학", role="학생"),
    Student(student_id="252004", name="신세경", grade=2, status="재학", role="학생"),
    Student(student_id="252005", name="권지용", grade=2, status="재학", role="학생"),
    Student(student_id="252006", name="김태리", grade=2, status="재학", role="학생"),
    Student(student_id="252007", name="박서준", grade=2, status="재학", role="학생"),
    Student(student_id="252008", name="아이유", grade=2, status="재학", role="반대"),
    Student(student_id="252009", name="유재석", grade=2, status="재학", role="학생"),
    Student(student_id="252010", name="이효리", grade=2, status="재학", role="학생"),
    # --- 3학년 ---
    Student(student_id="243001", name="차은우", grade=3, status="재학", role="학생"),
    Student(student_id="243002", name="안유진", grade=3, status="재학", role="학생"),
    Student(student_id="243003", name="장원영", grade=3, status="재학", role="학생"),
    Student(student_id="243004", name="이도현", grade=3, status="재학", role="반대"),
    Student(student_id="243005", name="김세정", grade=3, status="재학", role="부반대"),
    Student(student_id="243006", name="손석구", grade=3, status="재학", role="학생"),
    Student(student_id="243007", name="고윤정", grade=3, status="재학", role="학생"),
    Student(student_id="243008", name="공유", grade=3, status="재학", role="학생"),
    Student(student_id="243009", name="김혜수", grade=3, status="재학", role="학생"),
    Student(student_id="243010", name="마동석", grade=3, status="재학", role="학생"),
]

# 청소 구역
areas_db = [
    Area(area_id="1", name="405호", description="405호 강의실 및 하드웨어 실습실 청소"),
    Area(area_id="2", name="304호", description="304호 강의실 청소"),
    Area(area_id="3", name="301호", description="301호 강의실 청소"),
    Area(area_id="4", name="가습기", description="가습기 청소"),
]

# 청소 일정
schedules_db: List[Schedule] = []

# 청소 배정
assignments_db: List[Assignment] = []

# 청소 교환
trades_db: List[Trade] = []
