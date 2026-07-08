from fastapi import APIRouter, BackgroundTasks, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.stress_entry import StressEntry
from app.models.user import User
from app.schemas.report import SessionReportResponse
from app.schemas.session import SessionCreate, SessionResponse, StressEntryCreate, StressEntryResponse
from app.schemas.task import TaskResponse
from app.services import report_service, session_service, task_service
from app.socket_manager import emit_stress_update

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse, status_code=201)
def start_session(
    data: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return session_service.create_session(db, current_user, data)


@router.get("/{session_id}/tasks", response_model=list[TaskResponse])
def list_tasks(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return task_service.get_session_tasks(db, session_id, current_user)


@router.post("/{session_id}/stress", response_model=StressEntryResponse, status_code=201)
async def record_stress(
    session_id: str,
    data: StressEntryCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = session_service.get_session(db, session_id, current_user)
    entry = StressEntry(session_id=session_id, level=data.level)
    db.add(entry)
    db.commit()
    db.refresh(entry)

    elapsed = 0.0
    if session.started_at:
        from datetime import datetime, timezone

        started = session.started_at
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        elapsed = round((datetime.now(timezone.utc) - started).total_seconds() / 60.0, 1)

    background_tasks.add_task(emit_stress_update, session_id, data.level, elapsed)
    return entry


@router.post("/{session_id}/close", response_model=SessionReportResponse)
async def close_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await report_service.close_session(db, session_id, current_user)


@router.get("/{session_id}/report", response_model=SessionReportResponse)
def get_report(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return report_service.get_session_report(db, session_id, current_user)


@router.get("/{session_id}/report.pdf")
def download_report_pdf(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = report_service.get_session_report(db, session_id, current_user)
    pdf_bytes = report_service.generate_pdf(report)
    filename = f"rapport-stress-{session_id[:8]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
