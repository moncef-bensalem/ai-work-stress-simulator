from contextlib import asynccontextmanager
import logging

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.core.database import Base, engine
from app.models.assigned_task import AssignedTask  # noqa: F401 — table creation
from app.models.user import User
from app.routers import admin, auth, chat, dashboard, manager, metrics, sessions, tasks
from app.services.aria_service import get_aria_status
from app.socket_manager import sio, start_scheduler, stop_scheduler

logger = logging.getLogger(__name__)


def _migrate_schema():
    columns = [
        ("users", "role", "VARCHAR(20) DEFAULT 'user'"),
        ("users", "webauthn_credential", "VARCHAR(2000)"),
        ("users", "face_descriptor", "TEXT"),
        ("sessions", "stress_score", "INTEGER"),
        ("sessions", "recommendations", "TEXT"),
        ("users", "preferences", "TEXT"),
        ("users", "team", "VARCHAR(50) DEFAULT 'developpement'"),
        ("users", "badges", "TEXT"),
        ("sessions", "behavior_analysis", "TEXT"),
        ("users", "poste", "VARCHAR(50) DEFAULT 'developpeur'"),
    ]
    for table, column, col_type in columns:
        try:
            with engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
                conn.commit()
        except Exception:
            pass

    if settings.ADMIN_EMAIL:
        from app.core.database import SessionLocal

        db = SessionLocal()
        try:
            admin_user = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
            if admin_user and getattr(admin_user, "role", "user") != "admin":
                admin_user.role = "admin"
                db.commit()
        finally:
            db.close()

    if settings.MANAGER_EMAIL:
        from app.core.database import SessionLocal

        db = SessionLocal()
        try:
            manager_user = db.query(User).filter(User.email == settings.MANAGER_EMAIL).first()
            if manager_user and getattr(manager_user, "role", "user") not in ("admin", "manager"):
                manager_user.role = "manager"
                db.commit()
        finally:
            db.close()

    from app.core.database import SessionLocal

    db = SessionLocal()
    try:
        for user in db.query(User).filter(User.team.is_(None)).all():
            user.team = "developpement"
        for user in db.query(User).filter(User.poste.is_(None)).all():
            user.poste = "developpeur"
        db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _migrate_schema()
    aria = get_aria_status()
    logger.info("ARIA démarrage : mode=%s — %s", aria["mode"], aria["detail"])
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="AI Work Stress Simulator API",
    description="Plateforme interactive de sensibilisation à l'aliénation numérique",
    version="0.4.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(admin.router)
app.include_router(manager.router)
app.include_router(sessions.router)
app.include_router(tasks.router)
app.include_router(chat.router)
app.include_router(metrics.router)


@app.get("/")
def root():
    return {"message": "AI Work Stress Simulator API", "status": "running", "version": "0.4.0"}


@app.get("/api/health")
def health_check():
    db_status = "ok"
    aria = get_aria_status()
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        db_status = "unavailable"
    return {
        "status": "ok",
        "service": "backend",
        "database": db_status,
        "aria": aria["mode"],
        "aria_detail": aria["detail"],
    }


socket_app = socketio.ASGIApp(sio, other_asgi_app=app)
