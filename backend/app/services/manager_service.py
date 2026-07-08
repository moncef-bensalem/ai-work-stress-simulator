"""Dashboard Manager / RH — vue équipes."""

from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.session import WorkSession
from app.models.user import User
from app.services.analytics_service import compute_current_scores, compute_global_stress_score

TEAM_LABELS = {
    "developpement": "Équipe Développement",
    "rh": "Équipe RH",
    "commercial": "Équipe Commerciale",
    "design": "Équipe Design",
}

DEFAULT_TEAM = "developpement"


def _employee_metrics(db: Session, user: User) -> dict:
    sessions = (
        db.query(WorkSession)
        .filter(WorkSession.user_id == user.id, WorkSession.ended_at.isnot(None))
        .all()
    )
    if not sessions:
        return {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "sessions_count": 0,
            "avg_stress_score": 0,
            "avg_productivity": 0,
            "simulation_hours": 0,
            "difficulty_score": 0,
            "performance_bar": 0,
        }

    stress_scores = []
    productivities = []
    total_minutes = 0.0
    for session in sessions:
        if session.stress_score is not None:
            stress_scores.append(session.stress_score)
        else:
            scores = compute_current_scores(db, session)
            stress_scores.append(compute_global_stress_score(scores, session.mode))
            productivities.append(scores["productivity"])
        if session.started_at and session.ended_at:
            delta = session.ended_at - session.started_at
            total_minutes += delta.total_seconds() / 60.0
        elif session.started_at:
            scores = compute_current_scores(db, session)
            total_minutes += scores["elapsed_minutes"]

    if not productivities and sessions:
        for session in sessions:
            scores = compute_current_scores(db, session)
            productivities.append(scores["productivity"])

    avg_stress = round(sum(stress_scores) / len(stress_scores), 1) if stress_scores else 0
    avg_prod = round(sum(productivities) / len(productivities), 1) if productivities else 0
    difficulty = round(avg_stress * 0.6 + (100 - avg_prod) * 0.4)

    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "sessions_count": len(sessions),
        "avg_stress_score": avg_stress,
        "avg_productivity": avg_prod,
        "simulation_hours": round(total_minutes / 60.0, 1),
        "difficulty_score": difficulty,
        "performance_bar": min(100, int(avg_prod)),
    }


def get_manager_overview(db: Session) -> dict:
    users = db.query(User).filter(User.role == "user").all()
    teams_map: dict[str, list] = {}

    for user in users:
        team = user.team or DEFAULT_TEAM
        teams_map.setdefault(team, []).append(_employee_metrics(db, user))

    teams = []
    all_employees = []
    for team_id, employees in teams_map.items():
        if not employees:
            continue
        avg_stress = round(sum(e["avg_stress_score"] for e in employees) / len(employees), 1)
        avg_prod = round(sum(e["avg_productivity"] for e in employees) / len(employees), 1)
        avg_fatigue_proxy = round(avg_stress * 0.85)
        avg_cognitive = round(min(100, avg_stress * 0.9 + (100 - avg_prod) * 0.3))
        total_hours = round(sum(e["simulation_hours"] for e in employees), 1)
        employees_sorted = sorted(employees, key=lambda e: e["performance_bar"], reverse=True)
        teams.append(
            {
                "id": team_id,
                "name": TEAM_LABELS.get(team_id, team_id.replace("_", " ").title()),
                "avg_stress_score": avg_stress,
                "avg_fatigue": avg_fatigue_proxy,
                "avg_cognitive_load": avg_cognitive,
                "avg_productivity": avg_prod,
                "simulation_hours": total_hours,
                "employees": employees_sorted,
            }
        )
        all_employees.extend(employees)

    struggling = sorted(all_employees, key=lambda e: e["difficulty_score"], reverse=True)[:5]
    total_sessions = db.query(func.count(WorkSession.id)).scalar() or 0

    return {
        "teams": sorted(teams, key=lambda t: t["name"]),
        "struggling_employees": [e for e in struggling if e["difficulty_score"] > 0],
        "total_employees": len(all_employees),
        "total_simulation_hours": round(sum(e["simulation_hours"] for e in all_employees), 1),
        "total_sessions": total_sessions,
    }
