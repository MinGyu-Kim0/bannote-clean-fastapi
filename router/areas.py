from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user, require_admin
from db.models import Student, get_db
from db.schemas import AreaCreate, AreaUpdate
from services import areas_service

router = APIRouter(prefix="/areas", tags=["청소 구역 관리"])


@router.get("/")
def get_areas(
    db: Session = Depends(get_db),
    _: Student = Depends(get_current_user),
):
    return areas_service.get_areas(db=db)


@router.post("/")
def add_areas(
    payload: AreaCreate,
    db: Session = Depends(get_db),
    _: Student = Depends(require_admin),
):
    return areas_service.add_area(
        db=db,
        name=payload.name,
        need_peoples=payload.need_peoples,
        target_grades=payload.target_grades,
    )


@router.patch("/{area_id}")
def update_areas(
    area_id: int,
    update_data: AreaUpdate,
    db: Session = Depends(get_db),
    _: Student = Depends(require_admin),
):
    return areas_service.update_area(db=db, area_id=area_id, update_data=update_data)


@router.delete("/{area_id}")
def del_areas(
    area_id: int,
    db: Session = Depends(get_db),
    _: Student = Depends(require_admin),
):
    return areas_service.del_area(db=db, area_id=area_id)
