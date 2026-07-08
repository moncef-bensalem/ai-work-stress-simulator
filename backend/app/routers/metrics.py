from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.metrics import SessionMetricsResponse
from app.services.analytics_service import compute_session_metrics
from app.services.session_service import get_session

router = APIRouter(prefix="/api/sessions", tags=["metrics"])


@router.get("/{session_id}/metrics", response_model=SessionMetricsResponse)
def get_session_metrics(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = get_session(db, session_id, current_user)
    return compute_session_metrics(db, session)
