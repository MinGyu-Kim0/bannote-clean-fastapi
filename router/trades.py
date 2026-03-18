from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user, require_admin
from db.models import Assignment, Student, get_db
from db.schemas import TradeCreate, TradeUpdate
from services import trades_service

router = APIRouter(prefix="/trades", tags=["청소 교환 관리"])


def _get_student_assignment_ids(db: Session, student_pk: int) -> set[int]:
    """학생의 모든 배정 ID 조회"""
    assignments = db.query(Assignment.assignment_id).filter(Assignment.student_pk == student_pk).all()
    return {a.assignment_id for a in assignments}


@router.get("/")
def get_trades(
    request_id: int | None = Query(default=None),
    requester_assignment_id: int | None = Query(default=None),
    target_assignment_id: int | None = Query(default=None),
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: Student = Depends(get_current_user),
):
    return trades_service.get_trades(
        db=db,
        request_id=request_id,
        requester_assignment_id=requester_assignment_id,
        target_assignment_id=target_assignment_id,
        status=status,
    )


@router.post("/")
def add_trade(
    payload: TradeCreate,
    db: Session = Depends(get_db),
    current_user: Student = Depends(get_current_user),
):
    if current_user.role != "관리자":
        my_ids = _get_student_assignment_ids(db, current_user.student_pk)
        if payload.requester_assignment_id not in my_ids:
            raise HTTPException(status_code=403, detail="본인의 배정만 교환 요청할 수 있습니다.")

    return trades_service.add_trade(
        db=db,
        requester_assignment_id=payload.requester_assignment_id,
        target_assignment_id=payload.target_assignment_id,
    )


@router.patch("/{request_id}")
def update_trade_status(
    request_id: int,
    update_data: TradeUpdate,
    db: Session = Depends(get_db),
    current_user: Student = Depends(get_current_user),
):
    if current_user.role != "관리자":
        trade = trades_service._get_trade_or_404(db, request_id)
        my_ids = _get_student_assignment_ids(db, current_user.student_pk)
        if trade.requester_assignment_id not in my_ids and trade.target_assignment_id not in my_ids:
            raise HTTPException(status_code=403, detail="본인과 관련된 교환만 처리할 수 있습니다.")

    return trades_service.update_trade_status(db=db, request_id=request_id, update_data=update_data)


@router.delete("/{request_id}")
def delete_trade(
    request_id: int,
    db: Session = Depends(get_db),
    _: Student = Depends(require_admin),
):
    return trades_service.delete_trade(db=db, request_id=request_id)
