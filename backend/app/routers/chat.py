from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.services.chat_service import get_messages, message_to_dict
from app.services.fsm_service import phase_label

router = APIRouter(prefix="/api/sessions", tags=["chat"])


@router.get("/{session_id}/messages")
def list_messages(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.session_service import get_session

    session = get_session(db, session_id, current_user)
    messages = get_messages(db, session_id)
    return {
        "phase": session.phase,
        "phase_label": phase_label(session.phase),
        "mode": session.mode,
        "messages": [message_to_dict(m) for m in messages],
    }
