import json

from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.preferences import UserPreferences, UserPreferencesUpdate

DEFAULT_PREFERENCES = UserPreferences().model_dump()


def _parse_preferences(raw: str | None) -> dict:
    if not raw:
        return dict(DEFAULT_PREFERENCES)
    try:
        data = json.loads(raw)
        return UserPreferences(**{**DEFAULT_PREFERENCES, **data}).model_dump()
    except (json.JSONDecodeError, ValueError):
        return dict(DEFAULT_PREFERENCES)


def get_user_preferences(user: User) -> UserPreferences:
    return UserPreferences(**_parse_preferences(user.preferences))


def update_user_preferences(db: Session, user: User, data: UserPreferencesUpdate) -> UserPreferences:
    current = _parse_preferences(user.preferences)
    updates = data.model_dump(exclude_unset=True)
    current.update(updates)
    validated = UserPreferences(**current)
    user.preferences = json.dumps(validated.model_dump(), ensure_ascii=False)
    db.commit()
    db.refresh(user)
    return validated
