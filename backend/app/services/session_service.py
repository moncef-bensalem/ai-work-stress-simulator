from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.session import WorkSession
from app.models.task import Task
from app.models.user import User
from app.schemas.session import SessionCreate

TASK_TEMPLATES = [
    {
        "title": "Valider les rapports hebdomadaires",
        "description": "Vérifier et approuver les 12 rapports d'activité de l'équipe.",
        "category": "validation",
        "allocated_minutes": 20,
    },
    {
        "title": "Trier les emails prioritaires",
        "description": "Classer 45 emails par urgence et assigner les labels appropriés.",
        "category": "tri",
        "allocated_minutes": 15,
    },
    {
        "title": "Rédiger le compte-rendu de réunion",
        "description": "Synthétiser les décisions et actions de la réunion du matin.",
        "category": "redaction",
        "allocated_minutes": 25,
    },
    {
        "title": "Déléguer la revue de code",
        "description": "Assigner la revue du module auth à un collègue disponible.",
        "category": "delegation",
        "allocated_minutes": 10,
    },
    {
        "title": "Corriger le bug critique production",
        "description": "Résoudre l'erreur 500 sur l'endpoint de paiement avant 17h.",
        "category": "urgent",
        "allocated_minutes": 30,
    },
]


def create_session(db: Session, user: User, data: SessionCreate) -> WorkSession:
    now = datetime.now(timezone.utc)
    session = WorkSession(
        user_id=user.id,
        display_name=data.display_name,
        mode=data.mode,
        phase="accueil",
        started_at=now,
    )
    db.add(session)
    db.flush()

    for index, template in enumerate(TASK_TEMPLATES):
        task = Task(
            session_id=session.id,
            title=template["title"],
            description=template["description"],
            category=template["category"],
            status="pending",
            sort_order=index,
            allocated_minutes=template["allocated_minutes"],
            deadline=now + timedelta(minutes=template["allocated_minutes"]),
        )
        db.add(task)

    db.commit()
    db.refresh(session)

    from app.services.aria_service import send_welcome
    send_welcome(db, session)

    return session


def get_session(db: Session, session_id: str, user: User) -> WorkSession:
    session = db.query(WorkSession).filter(
        WorkSession.id == session_id, WorkSession.user_id == user.id
    ).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session introuvable")
    return session
