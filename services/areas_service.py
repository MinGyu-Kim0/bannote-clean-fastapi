from fastapi import HTTPException
from sqlalchemy.orm import Session

from db import models, schemas


def get_areas(db: Session):
    return db.query(models.Area).order_by(models.Area.area_id).all()


def add_area(
    db: Session,
    name: str,
    need_peoples: int,
    target_grades: list[int],
):
    if need_peoples < 1:
        raise HTTPException(status_code=400, detail="필요 인원수는 1 이상이어야 합니다.")

    existing_area = db.query(models.Area).filter(models.Area.name == name).first()
    if existing_area:
        raise HTTPException(status_code=400, detail="이미 존재하는 구역 이름입니다.")

    area = models.Area(
        name=name,
        need_peoples=need_peoples,
        target_grades=target_grades,
    )
    db.add(area)
    db.commit()
    db.refresh(area)

    return {
        "message": "청소 구역이 추가되었습니다.",
        "area": area,
    }


def update_area(db: Session, area_id: int, update_data: schemas.AreaUpdate):
    area = db.query(models.Area).filter(models.Area.area_id == area_id).first()
    if not area:
        raise HTTPException(status_code=404, detail="찾을 수 없습니다.")

    update_dict = update_data.model_dump(exclude_unset=True, exclude_none=True)

    if "name" in update_dict:
        existing_name = (
            db.query(models.Area).filter(models.Area.name == update_dict["name"], models.Area.area_id != area_id).first()
        )
        if existing_name:
            raise HTTPException(status_code=400, detail="해당 이름으로 수정할 수 없습니다.")

    if "need_peoples" in update_dict and update_dict["need_peoples"] < 1:
        raise HTTPException(status_code=400, detail="필요 인원수는 1 이상이어야 합니다.")

    for key, value in update_dict.items():
        setattr(area, key, value)

    db.commit()
    db.refresh(area)

    return {"message": "정보가 수정되었습니다.", "area": area}


def del_area(db: Session, area_id: int):
    area = db.query(models.Area).filter(models.Area.area_id == area_id).first()
    if not area:
        raise HTTPException(status_code=404, detail="찾을 수 없습니다.")

    linked_assignment = db.query(models.Assignment).filter(models.Assignment.area_id == area_id).first()
    if linked_assignment:
        raise HTTPException(status_code=400, detail="배정 이력이 있는 구역은 삭제할 수 없습니다.")

    db.delete(area)
    db.commit()

    return {"message": "삭제되었습니다."}
