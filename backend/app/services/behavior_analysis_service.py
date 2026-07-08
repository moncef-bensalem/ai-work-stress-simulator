"""Analyse comportementale post-session — coach ARIA."""

from __future__ import annotations

import json
import logging

from sqlalchemy.orm import Session

from app.models.chat_message import ChatMessage
from app.models.session import WorkSession
from app.models.task import Task
from app.models.task_event import TaskEvent
from app.services.analytics_service import compute_current_scores, compute_session_metrics
from app.services.llm_client import complete_llm

logger = logging.getLogger(__name__)


def _collect_signals(db: Session, session: WorkSession, scores: dict) -> dict:
    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session.id).all()
    user_msgs = [m for m in messages if m.sender == "user"]
    aria_msgs = [m for m in messages if m.sender == "aria"]
    events = (
        db.query(TaskEvent)
        .join(Task, TaskEvent.task_id == Task.id)
        .filter(Task.session_id == session.id)
        .all()
    )
    reorders = sum(1 for e in events if e.event_type == "reordered")
    elapsed = max(scores.get("elapsed_minutes", 1), 1)
    metrics = compute_session_metrics(db, session)
    stress_series = metrics["stress_series"]
    stress_delta = 0
    if len(stress_series) >= 2:
        stress_delta = stress_series[-1]["level"] - stress_series[0]["level"]

    return {
        "user_messages": len(user_msgs),
        "aria_messages": len(aria_msgs),
        "messages_per_min": round(len(user_msgs) / elapsed, 2),
        "reorders": reorders,
        "stress_delta": stress_delta,
        "pending_at_end": scores["tasks_total"] - scores["tasks_completed"],
        "productivity": scores["productivity"],
        "cognitive_load": scores["cognitive_load"],
        "completion_rate": scores["completion_rate"],
    }


def _rule_observations(signals: dict) -> list[str]:
    obs: list[str] = []

    if signals["messages_per_min"] >= 0.8:
        obs.append("Vous répondez très vite aux messages d'ARIA.")
    elif signals["messages_per_min"] <= 0.15 and signals["aria_messages"] > 2:
        obs.append("Vous répondez peu aux sollicitations d'ARIA — possible retrait ou surcharge.")

    if signals["reorders"] >= 3:
        obs.append("Vous réorganisez souvent vos priorités, signe d'interruptions fréquentes.")

    if signals["pending_at_end"] >= 2 and signals["productivity"] < 60:
        obs.append(
            "Lorsque plusieurs tâches restent en attente, votre productivité chute nettement."
        )

    if signals["stress_delta"] >= 3:
        obs.append("Votre stress déclaré augmente fortement au fil de la session.")

    if signals["cognitive_load"] >= 70 and signals["completion_rate"] < 70:
        obs.append("Sous forte charge cognitive, votre taux d'achèvement diminue.")

    if not obs:
        obs.append("Votre rythme de travail reste relativement stable pendant la simulation.")

    return obs


def _default_coaching(signals: dict, observations: list[str]) -> str:
    if signals["reorders"] >= 3 or signals["messages_per_min"] >= 0.8:
        return (
            "Désactivez les notifications pendant les tâches longues et regroupez "
            "les réponses à ARIA en plages dédiées."
        )
    if signals["stress_delta"] >= 3:
        return "Planifiez des micro-pauses de 5 minutes après chaque pic de stress déclaré."
    if signals["cognitive_load"] >= 70:
        return "Limitez le multitâche : terminez une tâche avant d'en ouvrir une nouvelle."
    return "Continuez à structurer votre journée par blocs de concentration sans interruption."


async def generate_behavior_analysis(db: Session, session: WorkSession) -> dict:
    scores = compute_current_scores(db, session)
    signals = _collect_signals(db, session, scores)
    observations = _rule_observations(signals)
    coaching = _default_coaching(signals, observations)

    system = """Tu es ARIA, coach IA en simulation de stress au travail (projet ESPRIT).
À partir des observations comportementales, rédige un paragraphe de coaching en 3-4 phrases en français.
Ton bienveillant mais direct. Pas de diagnostic médical. Termine par un conseil actionnable."""
    prompt = (
        f"Observations : {' | '.join(observations)}\n"
        f"Signaux : messages/min={signals['messages_per_min']}, réordonnancements={signals['reorders']}, "
        f"delta stress={signals['stress_delta']}, productivité={signals['productivity']}%, "
        f"charge cognitive={signals['cognitive_load']}%."
    )
    narrative = coaching
    try:
        reply, _ = await complete_llm(system, prompt)
        if reply and len(reply) > 40:
            narrative = reply.strip()
    except Exception as exc:
        logger.warning("Analyse comportementale LLM indisponible : %s", exc)

    return {
        "observations": observations,
        "signals": signals,
        "coaching": narrative,
        "advice": coaching,
    }


def parse_behavior_analysis(raw: str | None) -> dict | None:
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None
