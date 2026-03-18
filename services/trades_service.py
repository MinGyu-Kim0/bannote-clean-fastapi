from fastapi import HTTPException
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from db import models, schemas

ALLOWED_TERMINAL_STATUSES = {"수락", "거절", "취소"}


def _get_assignment_or_404(db: Session, assignment_id: int):
    assignment = db.query(models.Assignment).filter(models.Assignment.assignment_id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail=f"{assignment_id}번 배정을 찾을 수 없습니다.")
    return assignment


def _get_trade_or_404(db: Session, request_id: int):
    trade = db.query(models.Trade).filter(models.Trade.request_id == request_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail=f"{request_id}번 교환 요청을 찾을 수 없습니다.")
    return trade


def _has_active_assignment(
    db: Session,
    schedule_id: int,
    student_pk: int,
    excluded_assignment_ids: set[int],
) -> bool:
    query = db.query(models.Assignment).filter(
        models.Assignment.schedule_id == schedule_id,
        models.Assignment.student_pk == student_pk,
        models.Assignment.status != "취소",
    )
    if excluded_assignment_ids:
        query = query.filter(models.Assignment.assignment_id.notin_(excluded_assignment_ids))
    return query.first() is not None


def _validate_no_duplicate_after_swap(db: Session, requester_assignment, target_assignment):
    excluded_ids = {requester_assignment.assignment_id, target_assignment.assignment_id}

    requester_next_student_pk = target_assignment.student_pk
    target_next_student_pk = requester_assignment.student_pk

    if _has_active_assignment(
        db=db,
        schedule_id=requester_assignment.schedule_id,
        student_pk=requester_next_student_pk,
        excluded_assignment_ids=excluded_ids,
    ):
        raise HTTPException(
            status_code=400,
            detail="교환 후 신청자 일정에 동일 학생이 중복 배정됩니다.",
        )

    if _has_active_assignment(
        db=db,
        schedule_id=target_assignment.schedule_id,
        student_pk=target_next_student_pk,
        excluded_assignment_ids=excluded_ids,
    ):
        raise HTTPException(
            status_code=400,
            detail="교환 후 대상자 일정에 동일 학생이 중복 배정됩니다.",
        )


def _validate_trade_pair(db: Session, requester_assignment_id: int, target_assignment_id: int):
    if requester_assignment_id == target_assignment_id:
        raise HTTPException(status_code=400, detail="동일한 배정끼리는 교환할 수 없습니다.")

    requester_assignment = _get_assignment_or_404(db, requester_assignment_id)
    target_assignment = _get_assignment_or_404(db, target_assignment_id)

    if requester_assignment.status == "취소" or target_assignment.status == "취소":
        raise HTTPException(status_code=400, detail="취소된 배정은 교환할 수 없습니다.")

    if requester_assignment.schedule_id == target_assignment.schedule_id:
        raise HTTPException(status_code=400, detail="같은 일정의 배정끼리는 교환할 수 없습니다.")

    _validate_no_duplicate_after_swap(db, requester_assignment, target_assignment)

    return requester_assignment, target_assignment


def get_trades(
    db: Session,
    request_id: int | None = None,
    requester_assignment_id: int | None = None,
    target_assignment_id: int | None = None,
    status: str | None = None,
):
    query = db.query(models.Trade).order_by(models.Trade.request_id)

    if request_id is not None:
        matched = query.filter(models.Trade.request_id == request_id).all()
        if not matched:
            raise HTTPException(status_code=404, detail="해당 교환 요청이 존재하지 않습니다.")
        return matched

    if requester_assignment_id is not None:
        query = query.filter(models.Trade.requester_assignment_id == requester_assignment_id)
    if target_assignment_id is not None:
        query = query.filter(models.Trade.target_assignment_id == target_assignment_id)
    if status is not None:
        query = query.filter(models.Trade.status == status)

    return query.all()


def add_trade(db: Session, requester_assignment_id: int, target_assignment_id: int):
    _validate_trade_pair(db, requester_assignment_id, target_assignment_id)

    existing_trade = (
        db.query(models.Trade)
        .filter(
            models.Trade.status == "대기",
            or_(
                and_(
                    models.Trade.requester_assignment_id == requester_assignment_id,
                    models.Trade.target_assignment_id == target_assignment_id,
                ),
                and_(
                    models.Trade.requester_assignment_id == target_assignment_id,
                    models.Trade.target_assignment_id == requester_assignment_id,
                ),
            ),
        )
        .first()
    )
    if existing_trade:
        raise HTTPException(status_code=400, detail="이미 대기 중인 동일 교환 요청이 존재합니다.")

    trade = models.Trade(
        requester_assignment_id=requester_assignment_id,
        target_assignment_id=target_assignment_id,
        status="대기",
    )
    db.add(trade)
    db.commit()
    db.refresh(trade)

    return {"message": "교환 요청이 등록되었습니다.", "trade": trade}


def update_trade_status(db: Session, request_id: int, update_data: schemas.TradeUpdate):
    trade = _get_trade_or_404(db, request_id)

    if trade.status != "대기":
        raise HTTPException(status_code=400, detail="대기 중인 요청만 처리할 수 있습니다.")

    next_status = update_data.status
    if next_status not in ALLOWED_TERMINAL_STATUSES:
        raise HTTPException(status_code=400, detail="요청 상태는 수락/거절/취소만 가능합니다.")

    if next_status == "수락":
        requester_assignment, target_assignment = _validate_trade_pair(
            db,
            trade.requester_assignment_id,
            trade.target_assignment_id,
        )
        requester_assignment.student_pk, target_assignment.student_pk = (
            target_assignment.student_pk,
            requester_assignment.student_pk,
        )

    trade.status = next_status
    db.commit()
    db.refresh(trade)

    return {"message": "교환 요청 상태가 변경되었습니다.", "trade": trade}


def delete_trade(db: Session, request_id: int):
    trade = _get_trade_or_404(db, request_id)
    db.delete(trade)
    db.commit()
    return {"message": "교환 요청이 삭제되었습니다."}
