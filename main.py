from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from db.models import init_db
from router import assignments, areas, schedules, students, trades


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

app.include_router(students.router)
app.include_router(areas.router)
app.include_router(schedules.router)
app.include_router(assignments.router)
app.include_router(trades.router)
app.mount("/ui", StaticFiles(directory="test", html=True), name="ui")


# 헬스 체크
@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "ok", "version": "1.0.0"}
