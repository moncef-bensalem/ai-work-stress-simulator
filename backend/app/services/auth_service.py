import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import UserRegister

_reset_tokens: dict[str, tuple[str, datetime]] = {}


def register_user(db: Session, data: UserRegister) -> User:
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email déjà utilisé")
    role = "admin" if settings.ADMIN_EMAIL and data.email.lower() == settings.ADMIN_EMAIL.lower() else "user"
    if settings.MANAGER_EMAIL and data.email.lower() == settings.MANAGER_EMAIL.lower() and role != "admin":
        role = "manager"
    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        role=role,
        team="developpement",
        poste="developpeur",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Identifiants invalides")
    return user


def create_tokens(user: User) -> dict:
    return {
        "access_token": create_access_token(user.email),
        "refresh_token": create_refresh_token(user.email),
        "token_type": "bearer",
    }


def refresh_access_token(db: Session, refresh_token: str) -> dict:
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token invalide")
    user = db.query(User).filter(User.email == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur introuvable")
    return create_tokens(user)


def request_password_reset(db: Session, email: str) -> tuple[str, bool]:
    """Retourne (token, user_exists)."""
    user = db.query(User).filter(User.email == email).first()
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=1)
    if user:
        _reset_tokens[token] = (email.lower(), expires)
    return token, user is not None


def reset_password(db: Session, token: str, new_password: str) -> None:
    entry = _reset_tokens.get(token)
    if not entry:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lien invalide ou expiré")
    email, expires = entry
    if datetime.now(timezone.utc) > expires:
        _reset_tokens.pop(token, None)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lien expiré")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")
    user.hashed_password = hash_password(new_password)
    db.commit()
    _reset_tokens.pop(token, None)


def change_password(db: Session, user: User, current_password: str, new_password: str) -> None:
    if not verify_password(current_password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mot de passe actuel incorrect")
    if verify_password(new_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le nouveau mot de passe doit être différent de l'actuel",
        )
    user.hashed_password = hash_password(new_password)
    db.commit()


def authenticate_google(db: Session, credential: str) -> User:
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Sign-In non configuré (GOOGLE_CLIENT_ID)",
        )
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        idinfo = id_token.verify_oauth2_token(credential, google_requests.Request(), settings.GOOGLE_CLIENT_ID)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token Google invalide") from exc

    email = idinfo.get("email")
    name = idinfo.get("name") or email.split("@")[0]
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email Google manquant")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        role = "admin" if settings.ADMIN_EMAIL and email.lower() == settings.ADMIN_EMAIL.lower() else "user"
        user = User(
            email=email,
            full_name=name,
            hashed_password=hash_password(secrets.token_urlsafe(16)),
            role=role,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def store_webauthn_credential(db: Session, user: User, credential_json: str) -> None:
    user.webauthn_credential = credential_json
    db.commit()


def authenticate_webauthn(db: Session, email: str, credential_id: str) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.webauthn_credential:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Biométrie non enregistrée")
    import json

    stored = json.loads(user.webauthn_credential)
    if stored.get("id") != credential_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Identifiant biométrique invalide")
    return user


FACE_MATCH_THRESHOLD = 0.55


def _euclidean_distance(a: list[float], b: list[float]) -> float:
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


def store_face_descriptor(db: Session, user: User, descriptor: list[float]) -> None:
    import json

    user.face_descriptor = json.dumps(descriptor)
    db.commit()


def authenticate_face(db: Session, email: str, descriptor: list[float]) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.face_descriptor:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Visage non enregistré pour ce compte",
        )
    import json

    stored = json.loads(user.face_descriptor)
    distance = _euclidean_distance(stored, descriptor)
    if distance > FACE_MATCH_THRESHOLD:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Visage non reconnu")
    return user


def user_has_face_registered(user: User) -> bool:
    return bool(user.face_descriptor)
