from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from db.models import get_db
from db.schemas import TradeCreate, TradeUpdate
from services import trades_service

router = APIRouter(prefix="/trades", tags=["청소 교환 관리"])


@router.get("/")
def get_trades(
    request_id: int | None = Query(default=None),
    requester_assignment_id: int | None = Query(default=None),
    target_assignment_id: int | None = Query(default=None),
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return trades_service.get_trades(
        db=db,
        request_id=request_id,
        requester_assignment_id=requester_assignment_id,
        target_assignment_id=target_assignment_id,
        status=status,
    )


@router.post("/")
def add_trade(payload: TradeCreate, db: Session = Depends(get_db)):
    return trades_service.add_trade(
        db=db,
        requester_assignment_id=payload.requester_assignment_id,
        target_assignment_id=payload.target_assignment_id,
    )


@router.patch("/{request_id}")
def update_trade_status(request_id: int, update_data: TradeUpdate, db: Session = Depends(get_db)):
    return trades_service.update_trade_status(db=db, request_id=request_id, update_data=update_data)


@router.delete("/{request_id}")
def delete_trade(request_id: int, db: Session = Depends(get_db)):
    return trades_service.delete_trade(db=db, request_id=request_id)
