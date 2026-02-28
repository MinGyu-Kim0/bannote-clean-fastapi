from fastapi import FastAPI
from router import students, areas

app = FastAPI(title="청소 관리 시스템", description="청소 구역 배정 및 관리를 위한 API 서버", version="1.0.0")

app.include_router(students.router)
app.include_router(areas.router)


# 헬스 체크
@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "ok", "version": "1.0.0"}
