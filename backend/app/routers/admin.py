from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_admin_user, get_current_user
from app.core.security import hash_password
from app.models.session import WorkSession
from app.models.stress_entry import StressEntry
from app.models.user import User
from app.schemas.admin import AdminStatsResponse, AdminUserCreate, AdminUserResponse, AdminUserUpdate
from app.schemas.admin_analytics import AdminAnalyticsResponse, AdminLiveResponse
from app.services import admin_analytics_service

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStatsResponse)
def admin_stats(db: Session = Depends(get_db), _: User = Depends(get_admin_user)):
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_sessions = db.query(func.count(WorkSession.id)).scalar() or 0
    avg_stress = db.query(func.avg(StressEntry.level)).scalar()
    active_sessions = (
        db.query(func.count(WorkSession.id)).filter(WorkSession.ended_at.is_(None)).scalar() or 0
    )
    return {
        "total_users": total_users,
        "total_sessions": total_sessions,
        "active_sessions": active_sessions,
        "average_stress": round(float(avg_stress or 0), 1),
    }


@router.get("/analytics", response_model=AdminAnalyticsResponse)
def admin_analytics(db: Session = Depends(get_db), _: User = Depends(get_admin_user)):
    return admin_analytics_service.get_admin_analytics(db)


@router.get("/live", response_model=AdminLiveResponse)
def admin_live(db: Session = Depends(get_db), _: User = Depends(get_admin_user)):
    return admin_analytics_service.get_admin_live(db)


@router.get("/users", response_model=list[AdminUserResponse])
def list_users(db: Session = Depends(get_db), _: User = Depends(get_admin_user)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    result = []
    for user in users:
        sessions_count = db.query(func.count(WorkSession.id)).filter(WorkSession.user_id == user.id).scalar() or 0
        result.append(
            {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": getattr(user, "role", "user"),
                "team": getattr(user, "team", None),
                "poste": getattr(user, "poste", None),
                "sessions_count": sessions_count,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            }
        )
    return result


@router.post("/users", response_model=AdminUserResponse, status_code=201)
def create_user(data: AdminUserCreate, db: Session = Depends(get_db), _: User = Depends(get_admin_user)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        role=data.role,
        team=data.team,
        poste=data.poste,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "team": user.team,
        "poste": user.poste,
        "sessions_count": 0,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.put("/users/{user_id}", response_model=AdminUserResponse)
def update_user(
    user_id: str,
    data: AdminUserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.role is not None:
        user.role = data.role
    if data.team is not None:
        user.team = data.team
    if data.poste is not None:
        user.poste = data.poste
    if data.password:
        user.hashed_password = hash_password(data.password)
    db.commit()
    db.refresh(user)
    sessions_count = db.query(func.count(WorkSession.id)).filter(WorkSession.user_id == user.id).scalar() or 0
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "team": user.team,
        "poste": user.poste,
        "sessions_count": sessions_count,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: str, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Impossible de supprimer votre propre compte")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    db.delete(user)
    db.commit()
