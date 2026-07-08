from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    FaceDescriptorRequest,
    FaceLoginRequest,
    FaceStatusResponse,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    RefreshRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserRegister,
    UserResponse,
    WebAuthnLoginRequest,
)
from app.schemas.preferences import UserPreferences, UserPreferencesUpdate
from app.services import auth_service
from app.services import preferences_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
def register(data: UserRegister, db: Session = Depends(get_db)):
    return auth_service.register_user(db, data)


@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = auth_service.authenticate_user(db, form.username, form.password)
    return auth_service.create_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
def refresh(data: RefreshRequest, db: Session = Depends(get_db)):
    return auth_service.refresh_access_token(db, data.refresh_token)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=getattr(current_user, "role", "user"),
    )


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    from app.services.email_service import send_password_reset_email, smtp_configured

    token, user_exists = auth_service.request_password_reset(db, data.email)
    email_sent = False
    dev_reset_token: str | None = None

    if user_exists and smtp_configured():
        reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={token}"
        try:
            send_password_reset_email(data.email, reset_url)
            email_sent = True
        except Exception as exc:
            from fastapi import HTTPException

            raise HTTPException(
                status_code=503,
                detail="Impossible d'envoyer l'email. Vérifiez la configuration SMTP.",
            ) from exc
    elif user_exists:
        dev_reset_token = token

    return {
        "message": "Si l'email existe, un lien de réinitialisation a été envoyé.",
        "email_sent": email_sent,
        "dev_reset_token": dev_reset_token,
    }


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    auth_service.reset_password(db, data.token, data.new_password)
    return {"message": "Mot de passe mis à jour avec succès"}


@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    auth_service.change_password(db, current_user, data.current_password, data.new_password)
    return {"message": "Mot de passe modifié avec succès"}


@router.post("/google", response_model=TokenResponse)
def google_login(data: GoogleAuthRequest, db: Session = Depends(get_db)):
    user = auth_service.authenticate_google(db, data.credential)
    return auth_service.create_tokens(user)


@router.post("/webauthn/login", response_model=TokenResponse)
def webauthn_login(data: WebAuthnLoginRequest, db: Session = Depends(get_db)):
    user = auth_service.authenticate_webauthn(db, data.email, data.credential_id)
    return auth_service.create_tokens(user)


@router.post("/webauthn/register")
def webauthn_register(
    credential: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import json

    auth_service.store_webauthn_credential(db, current_user, json.dumps(credential))
    return {"message": "Authentification biométrique enregistrée"}


@router.get("/face/status", response_model=FaceStatusResponse)
def face_status(current_user: User = Depends(get_current_user)):
    return FaceStatusResponse(registered=auth_service.user_has_face_registered(current_user))


@router.post("/face/register")
def face_register(
    data: FaceDescriptorRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    auth_service.store_face_descriptor(db, current_user, data.descriptor)
    return {"message": "Visage enregistré avec succès"}


@router.post("/face/login", response_model=TokenResponse)
def face_login(data: FaceLoginRequest, db: Session = Depends(get_db)):
    user = auth_service.authenticate_face(db, data.email, data.descriptor)
    return auth_service.create_tokens(user)


@router.get("/preferences", response_model=UserPreferences)
def get_preferences(current_user: User = Depends(get_current_user)):
    return preferences_service.get_user_preferences(current_user)


@router.patch("/preferences", response_model=UserPreferences)
def update_preferences(
    data: UserPreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return preferences_service.update_user_preferences(db, current_user, data)
