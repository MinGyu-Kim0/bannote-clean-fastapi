from fastapi import APIRouter, Query

from schemas import TradeCreate, TradeUpdate
from services import trades_service

router = APIRouter(prefix="/trades", tags=["청소 교환 관리"])


@router.get("/")
def get_trades(
    request_id: int | None = Query(default=None),
    requester_assignment_id: int | None = Query(default=None),
    target_assignment_id: int | None = Query(default=None),
    status: str | None = Query(default=None),
):
    return trades_service.get_trades(
        request_id=request_id,
        requester_assignment_id=requester_assignment_id,
        target_assignment_id=target_assignment_id,
        status=status,
    )


@router.post("/")
def add_trade(payload: TradeCreate):
    return trades_service.add_trade(
        requester_assignment_id=payload.requester_assignment_id,
        target_assignment_id=payload.target_assignment_id,
    )


@router.patch("/{request_id}")
def update_trade_status(request_id: int, update_data: TradeUpdate):
    return trades_service.update_trade_status(request_id=request_id, update_data=update_data)


@router.delete("/{request_id}")
def delete_trade(request_id: int):
    return trades_service.delete_trade(request_id=request_id)
