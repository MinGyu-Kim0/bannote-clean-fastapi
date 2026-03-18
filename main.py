from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from db.models import init_db
from router import assignments, areas, auth, schedules, students, trades


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="청소 관리 시스템",
    description="청소 구역 배정 및 관리를 위한 API 서버",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(students.router)
app.include_router(areas.router)
app.include_router(schedules.router)
app.include_router(assignments.router)
app.include_router(trades.router)

# 정적 파일 마운트
app.mount("/static/shared", StaticFiles(directory="static/shared"), name="shared")
app.mount("/login", StaticFiles(directory="static/login", html=True), name="login")
app.mount("/admin", StaticFiles(directory="static/admin", html=True), name="admin")
app.mount("/user", StaticFiles(directory="static/user", html=True), name="user")
app.mount("/ui", StaticFiles(directory="test", html=True), name="ui")


# 루트 → 로그인 리다이렉트
@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/login")


# 헬스 체크
@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "ok", "version": "1.0.0"}
