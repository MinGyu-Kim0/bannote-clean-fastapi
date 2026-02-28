from fastapi import HTTPException

from db import assignments_db, trades_db
from schemas import Trade, TradeUpdate

ALLOWED_TERMINAL_STATUSES = {"수락", "거절", "취소"}


def _get_assignment_or_404(assignment_id: int):
    assignment = next((a for a in assignments_db if a.assignment_id == assignment_id), None)
    if not assignment:
        raise HTTPException(status_code=404, detail=f"{assignment_id}번 배정을 찾을 수 없습니다.")
    return assignment


def _get_trade_or_404(request_id: int):
    trade = next((t for t in trades_db if t.request_id == request_id), None)
    if not trade:
        raise HTTPException(status_code=404, detail=f"{request_id}번 교환 요청을 찾을 수 없습니다.")
    return trade


def _has_active_assignment(
    schedule_id: int,
    student_pk: int,
    excluded_assignment_ids: set[int],
) -> bool:
    return any(
        assignment.schedule_id == schedule_id
        and assignment.student_pk == student_pk
        and assignment.assignment_id not in excluded_assignment_ids
        and assignment.status != "취소"
        for assignment in assignments_db
    )


def _validate_no_duplicate_after_swap(requester_assignment, target_assignment):
    excluded_ids = {requester_assignment.assignment_id, target_assignment.assignment_id}

    requester_next_student_pk = target_assignment.student_pk
    target_next_student_pk = requester_assignment.student_pk

    if _has_active_assignment(
        schedule_id=requester_assignment.schedule_id,
        student_pk=requester_next_student_pk,
        excluded_assignment_ids=excluded_ids,
    ):
        raise HTTPException(
            status_code=400,
            detail="교환 후 신청자 일정에 동일 학생이 중복 배정됩니다.",
        )

    if _has_active_assignment(
        schedule_id=target_assignment.schedule_id,
        student_pk=target_next_student_pk,
        excluded_assignment_ids=excluded_ids,
    ):
        raise HTTPException(
            status_code=400,
            detail="교환 후 대상자 일정에 동일 학생이 중복 배정됩니다.",
        )


def _validate_trade_pair(requester_assignment_id: int, target_assignment_id: int):
    if requester_assignment_id == target_assignment_id:
        raise HTTPException(status_code=400, detail="동일한 배정끼리는 교환할 수 없습니다.")

    requester_assignment = _get_assignment_or_404(requester_assignment_id)
    target_assignment = _get_assignment_or_404(target_assignment_id)

    if requester_assignment.status == "취소" or target_assignment.status == "취소":
        raise HTTPException(status_code=400, detail="취소된 배정은 교환할 수 없습니다.")

    _validate_no_duplicate_after_swap(requester_assignment, target_assignment)

    return requester_assignment, target_assignment


def get_trades(
    request_id: int | None = None,
    requester_assignment_id: int | None = None,
    target_assignment_id: int | None = None,
    status: str | None = None,
):
    if request_id is not None:
        matched = [t for t in trades_db if t.request_id == request_id]
        if not matched:
            raise HTTPException(status_code=404, detail="해당 교환 요청이 존재하지 않습니다.")
        return matched

    matched = trades_db

    if requester_assignment_id is not None:
        matched = [t for t in matched if t.requester_assignment_id == requester_assignment_id]
    if target_assignment_id is not None:
        matched = [t for t in matched if t.target_assignment_id == target_assignment_id]
    if status is not None:
        matched = [t for t in matched if t.status == status]

    return matched


def add_trade(requester_assignment_id: int, target_assignment_id: int):
    _validate_trade_pair(requester_assignment_id, target_assignment_id)

    for trade in trades_db:
        same_pair = (
            trade.requester_assignment_id == requester_assignment_id and trade.target_assignment_id == target_assignment_id
        ) or (
            trade.requester_assignment_id == target_assignment_id and trade.target_assignment_id == requester_assignment_id
        )
        if same_pair and trade.status == "대기":
            raise HTTPException(status_code=400, detail="이미 대기 중인 동일 교환 요청이 존재합니다.")

    next_id = max((t.request_id for t in trades_db), default=0) + 1
    new_trade = Trade(
        request_id=next_id,
        requester_assignment_id=requester_assignment_id,
        target_assignment_id=target_assignment_id,
        status="대기",
    )
    trades_db.append(new_trade)

    return {"message": "교환 요청이 등록되었습니다.", "trade": new_trade}


def update_trade_status(request_id: int, update_data: TradeUpdate):
    trade = _get_trade_or_404(request_id)

    if trade.status != "대기":
        raise HTTPException(status_code=400, detail="대기 중인 요청만 처리할 수 있습니다.")

    next_status = update_data.status
    if next_status not in ALLOWED_TERMINAL_STATUSES:
        raise HTTPException(status_code=400, detail="요청 상태는 수락/거절/취소만 가능합니다.")

    if next_status == "수락":
        requester_assignment, target_assignment = _validate_trade_pair(
            trade.requester_assignment_id,
            trade.target_assignment_id,
        )
        requester_assignment.student_pk, target_assignment.student_pk = (
            target_assignment.student_pk,
            requester_assignment.student_pk,
        )

    trade.status = next_status

    return {"message": "교환 요청 상태가 변경되었습니다.", "trade": trade}


def delete_trade(request_id: int):
    trade = _get_trade_or_404(request_id)
    trades_db.remove(trade)
    return {"message": "교환 요청이 삭제되었습니다."}
