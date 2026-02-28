from fastapi import HTTPException
from schemas import Area, AreaUpdate
from db import areas_db


# 청소 구역 조회
def get_areas():
    return areas_db


# 청소 구역 추가
def add_area(area_id: int, name: str, need_peoples: int, target_grades: list[int]):
    if need_peoples < 1:
        raise HTTPException(status_code=400, detail="필요 인원수는 1 이상이어야 합니다.")

    new_area = Area(area_id=area_id, name=name, need_peoples=need_peoples, target_grades=target_grades)

    # db연동 시 삭제할 것(auto increment & PK)
    if any(a.area_id == area_id for a in areas_db):
        raise HTTPException(status_code=400, detail="이미 존재하는 구역입니다.")

    # 중복 방지
    if any(a.name == name for a in areas_db):
        raise HTTPException(status_code=400, detail="이미 존재하는 구역입니다.")

    areas_db.append(new_area)

    return {"message": f"{name} 추가 되었습니다.", "name": name}


# 청소 구역 수정
def update_area(area_id: int, update_data: AreaUpdate):
    area = next((a for a in areas_db if a.area_id == area_id), None)
    if not area:
        raise HTTPException(status_code=404, detail="찾을 수 없습니다.")

    update_dict = update_data.model_dump(exclude_unset=True)

    if "name" in update_dict:
        new_name = update_dict["name"]
        if any(a.name == new_name and a.area_id != area_id for a in areas_db):
            raise HTTPException(status_code=400, detail="해당 이름으로 수정할 수 없습니다.")

    if "need_peoples" in update_dict and update_dict["need_peoples"] < 1:
        raise HTTPException(status_code=400, detail="필요 인원수는 1 이상이어야 합니다.")

    for key, value in update_dict.items():
        setattr(area, key, value)
    return {"message": "정보가 수정되었습니다.", "area": area}


# 청소 구역 삭제
def del_area(area_id: int):
    area = next((a for a in areas_db if a.area_id == area_id), None)
    if not area:
        raise HTTPException(status_code=404, detail=f"찾을 수 없습니다.")

    else:
        areas_db.remove(area)

    return {"message": "삭제되었습니다."}
