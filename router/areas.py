from fastapi import APIRouter
from services import areas_service
from schemas import AreaUpdate

router = APIRouter(prefix="/areas", tags=["청소 구역 관리"])


# 청소 구역 조회 (GET)
@router.get("/")
def get_areas():
    return areas_service.get_areas()


# 청소 구역 추가 (POST)
@router.post("/")
def add_areas(area_id: int, name: str, need_peoples: int, target_grades: list[int]):
    return areas_service.add_area(
        area_id=area_id,
        name=name,
        need_peoples=need_peoples,
        target_grades=target_grades,
    )


# 청소 구역 수정 (PATCH)
@router.patch("/{area_id}")
def update_areas(area_id: int, update_data: AreaUpdate):
    return areas_service.update_area(area_id=area_id, update_data=update_data)


# 청소 구역 삭제 (DELETE)
@router.delete("/{area_id}")
def del_areas(area_id: int):
    return areas_service.del_area(area_id=area_id)
