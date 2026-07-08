"""Calcul des métriques comportementales — Sprint 3.

Proxies (0–100 sauf stress déclaré 1–10) :
- Productivité : taux d'achèvement + rythme de tâches terminées
- Charge cognitive : tâches en attente, réordonnancements, messages chat, phase FSM
- Fatigue : stress déclaré, durée session, tendance stress montante
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.datetime_utils import elapsed_minutes_since
from app.models.chat_message import ChatMessage
from app.models.session import WorkSession
from app.models.stress_entry import StressEntry
from app.models.task import Task
from app.models.task_event import TaskEvent

PHASE_COGNITIVE_WEIGHT = {
    "accueil": 15.0,
    "pression": 45.0,
    "pic": 75.0,
    "debriefing": 25.0,
}


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def _session_tasks(db: Session, session_id: str) -> list[Task]:
    return db.query(Task).filter(Task.session_id == session_id).all()


def _stress_entries(db: Session, session_id: str) -> list[StressEntry]:
    return (
        db.query(StressEntry)
        .filter(StressEntry.session_id == session_id)
        .order_by(StressEntry.recorded_at)
        .all()
    )


def _task_events(db: Session, session_id: str) -> list[TaskEvent]:
    return (
        db.query(TaskEvent)
        .join(Task, TaskEvent.task_id == Task.id)
        .filter(Task.session_id == session_id)
        .order_by(TaskEvent.timestamp)
        .all()
    )


def _chat_messages(db: Session, session_id: str) -> list[ChatMessage]:
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
        .all()
    )


def _stress_trend(entries: list[StressEntry]) -> float:
    if len(entries) < 2:
        return 0.0
    recent = entries[-3:]
    if len(recent) < 2:
        return 0.0
    delta = recent[-1].level - recent[0].level
    return _clamp(delta * 12.5)


def compute_productivity(tasks: list[Task], elapsed_min: float) -> float:
    if not tasks:
        return 0.0
    done = sum(1 for t in tasks if t.status in ("completed", "delegated"))
    return compute_productivity_from_counts(done, len(tasks), elapsed_min)


def compute_productivity_from_counts(done: int, total: int, elapsed_min: float) -> float:
    if total == 0:
        return 0.0
    completion_rate = done / total
    pace = done / max(elapsed_min / 15.0, 0.5)
    score = completion_rate * 65.0 + min(pace, 1.0) * 35.0
    return round(_clamp(score), 1)


def compute_cognitive_load_from_counts(
    pending: int,
    total: int,
    reorders: int,
    user_msgs: int,
    phase: str,
    elapsed_min: float,
) -> float:
    pending_ratio = pending / max(total, 1)
    reorder_rate = min(reorders / max(elapsed_min, 1.0), 1.0)
    chat_density = min(user_msgs / max(elapsed_min / 5.0, 1.0), 1.0)
    phase_weight = PHASE_COGNITIVE_WEIGHT.get(phase, 30.0)
    score = (
        pending_ratio * 35.0
        + reorder_rate * 20.0
        + chat_density * 20.0
        + phase_weight * 0.25
    )
    return round(_clamp(score), 1)


def compute_cognitive_load(
    tasks: list[Task],
    events: list[TaskEvent],
    messages: list[ChatMessage],
    phase: str,
    elapsed_min: float,
) -> float:
    pending = sum(1 for t in tasks if t.status in ("pending", "in_progress"))
    reorders = sum(1 for e in events if e.event_type == "reordered")
    user_msgs = sum(1 for m in messages if m.sender == "user")
    return compute_cognitive_load_from_counts(
        pending, len(tasks), reorders, user_msgs, phase, elapsed_min
    )


def compute_fatigue(stress_level: float, elapsed_min: float, stress_entries: list[StressEntry]) -> float:
    duration_factor = min(elapsed_min / 45.0, 1.0) * 35.0
    stress_factor = (stress_level / 10.0) * 45.0
    trend_factor = _stress_trend(stress_entries)
    return round(_clamp(stress_factor + duration_factor + trend_factor), 1)


def compute_current_scores(db: Session, session: WorkSession) -> dict:
    tasks = _session_tasks(db, session.id)
    events = _task_events(db, session.id)
    messages = _chat_messages(db, session.id)
    stress_entries = _stress_entries(db, session.id)
    elapsed_min = elapsed_minutes_since(session.started_at)
    latest_stress = stress_entries[-1].level if stress_entries else 5

    done = sum(1 for t in tasks if t.status in ("completed", "delegated"))
    completion_rate = round((done / len(tasks) * 100) if tasks else 0.0, 1)

    return {
        "productivity": compute_productivity(tasks, elapsed_min),
        "cognitive_load": compute_cognitive_load(tasks, events, messages, session.phase, elapsed_min),
        "fatigue": compute_fatigue(float(latest_stress), elapsed_min, stress_entries),
        "declared_stress": latest_stress,
        "completion_rate": completion_rate,
        "elapsed_minutes": round(elapsed_min, 1),
        "tasks_completed": done,
        "tasks_total": len(tasks),
        "chat_messages": len(messages),
        "reorder_events": sum(1 for e in events if e.event_type == "reordered"),
    }


def build_stress_series(entries: list[StressEntry]) -> list[dict]:
    series = []
    for entry in entries:
        ts = entry.recorded_at
        if ts and ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        series.append(
            {
                "time": ts.isoformat() if ts else None,
                "minute": 0,
                "level": entry.level,
            }
        )
    return series


def build_metrics_history(db: Session, session: WorkSession) -> list[dict]:
    """Points par minute depuis le début de session (proxies recalculés)."""
    if not session.started_at:
        return []

    tasks = _session_tasks(db, session.id)
    total = len(tasks)
    events = _task_events(db, session.id)
    messages = _chat_messages(db, session.id)
    stress_entries = _stress_entries(db, session.id)

    started = session.started_at
    if started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)

    now = datetime.now(timezone.utc)
    elapsed_min = max(1, int((now - started).total_seconds() // 60) + 1)
    history: list[dict] = []

    for minute in range(0, min(elapsed_min, 60) + 1):
        cutoff = started.timestamp() + minute * 60

        def before(ts: datetime | None) -> bool:
            if not ts:
                return False
            t = ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
            return t.timestamp() <= cutoff

        done = sum(
            1
            for e in events
            if e.event_type in ("completed", "delegated") and before(e.timestamp)
        )
        pending = max(0, total - done)
        minute_events = [e for e in events if before(e.timestamp)]
        minute_msgs = [m for m in messages if before(m.created_at)]
        minute_stress = [s for s in stress_entries if before(s.recorded_at)]
        stress_level = minute_stress[-1].level if minute_stress else 5
        reorders = sum(1 for e in minute_events if e.event_type == "reordered")
        user_msgs = sum(1 for m in minute_msgs if m.sender == "user")

        productivity = compute_productivity_from_counts(done, total, max(minute, 1))
        cognitive = compute_cognitive_load_from_counts(
            pending,
            total,
            reorders,
            user_msgs,
            session.phase,
            max(minute, 1),
        )
        fatigue = compute_fatigue(float(stress_level), max(minute, 1), minute_stress)

        history.append(
            {
                "minute": minute,
                "productivity": productivity,
                "cognitive_load": cognitive,
                "fatigue": fatigue,
                "stress": float(stress_level),
            }
        )

    return history


def compute_session_metrics(db: Session, session: WorkSession) -> dict:
    stress_entries = _stress_entries(db, session.id)
    stress_series = build_stress_series(stress_entries)

    started = session.started_at
    if started and started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)
    for point in stress_series:
        if point["time"] and started:
            ts = datetime.fromisoformat(point["time"].replace("Z", "+00:00"))
            point["minute"] = max(0, int((ts - started).total_seconds() // 60))

    return {
        "session_id": session.id,
        "phase": session.phase,
        "mode": session.mode,
        "current": compute_current_scores(db, session),
        "stress_series": stress_series,
        "history": build_metrics_history(db, session),
    }


MODE_STRESS_BOOST = {
    "bienveillante": 0.0,
    "exigeante": 5.0,
    "toxique": 10.0,
}


def compute_global_stress_score(scores: dict, mode: str) -> int:
    """Score composite 0–100 — Sprint 4."""
    declared = float(scores["declared_stress"]) * 10.0
    productivity_penalty = 100.0 - float(scores["productivity"])
    raw = (
        declared * 0.35
        + float(scores["cognitive_load"]) * 0.25
        + float(scores["fatigue"]) * 0.20
        + productivity_penalty * 0.20
        + MODE_STRESS_BOOST.get(mode, 0.0)
    )
    return int(round(_clamp(raw)))


def stress_score_label(score: int) -> str:
    if score < 35:
        return "Faible"
    if score < 60:
        return "Modéré"
    if score < 80:
        return "Élevé"
    return "Critique"
