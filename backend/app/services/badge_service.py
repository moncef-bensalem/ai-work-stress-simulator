"""Badges et gamification."""

from __future__ import annotations

import json

from sqlalchemy.orm import Session

from app.models.session import WorkSession
from app.models.user import User

BADGE_CATALOG = {
    "stress_master": {"emoji": "🥇", "label": "Bonne gestion du stress"},
    "all_tasks": {"emoji": "🎯", "label": "Toutes les tâches terminées"},
    "productivity": {"emoji": "⚡", "label": "Productivité excellente"},
    "low_cognitive": {"emoji": "🧠", "label": "Charge cognitive faible"},
    "five_sessions": {"emoji": "🔥", "label": "5 simulations réalisées"},
}


def _load_badges(user: User) -> list[str]:
    if not user.badges:
        return []
    try:
        return json.loads(user.badges)
    except json.JSONDecodeError:
        return []


def _save_badges(db: Session, user: User, badge_ids: list[str]) -> None:
    user.badges = json.dumps(sorted(set(badge_ids)), ensure_ascii=False)
    db.commit()


def evaluate_session_badges(scores: dict, stress_score: int) -> list[str]:
    earned: list[str] = []
    if stress_score < 45:
        earned.append("stress_master")
    if scores["tasks_completed"] >= scores["tasks_total"] and scores["tasks_total"] > 0:
        earned.append("all_tasks")
    if scores["productivity"] >= 80:
        earned.append("productivity")
    if scores["cognitive_load"] <= 45:
        earned.append("low_cognitive")
    return earned


def award_badges(db: Session, user: User, session: WorkSession, scores: dict, stress_score: int) -> list[dict]:
    existing = _load_badges(user)
    new_ids = evaluate_session_badges(scores, stress_score)

    total_sessions = db.query(WorkSession).filter(WorkSession.user_id == user.id).count()
    if total_sessions >= 5:
        new_ids.append("five_sessions")

    newly_earned = [b for b in new_ids if b not in existing]
    all_badges = list(set(existing + new_ids))
    if newly_earned or len(all_badges) != len(existing):
        _save_badges(db, user, all_badges)

    return [
        {"id": bid, **BADGE_CATALOG[bid], "new": bid in newly_earned}
        for bid in all_badges
        if bid in BADGE_CATALOG
    ]


def get_user_badges(user: User) -> list[dict]:
    return [
        {"id": bid, **BADGE_CATALOG[bid], "new": False}
        for bid in _load_badges(user)
        if bid in BADGE_CATALOG
    ]
