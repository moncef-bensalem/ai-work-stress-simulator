"""Clôture de session, rapport final et export PDF — Sprint 4."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from io import BytesIO

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.datetime_utils import elapsed_minutes_since
from app.models.session import WorkSession
from app.models.user import User
from app.services.analytics_service import (
    compute_current_scores,
    compute_global_stress_score,
    compute_session_metrics,
    stress_score_label,
)
from app.services.badge_service import award_badges, get_user_badges
from app.services.behavior_analysis_service import generate_behavior_analysis, parse_behavior_analysis
from app.services.llm_client import complete_llm
from app.services.session_service import get_session

logger = logging.getLogger(__name__)

PHASE_LABELS = {
    "accueil": "Accueil",
    "pression": "Montée en pression",
    "pic": "Pic de charge",
    "debriefing": "Débriefing",
}

MODE_LABELS = {
    "bienveillante": "Bienveillante",
    "exigeante": "Exigeante",
    "toxique": "Toxique",
}

MOCK_RECOMMENDATIONS = {
    "low": [
        "Votre niveau de stress simulé reste maîtrisé — continuez à structurer vos priorités en début de journée.",
        "La délégation de tâches non critiques peut préserver votre charge cognitive sur la durée.",
        "Prenez de courtes pauses entre les phases de forte concentration pour éviter l'accumulation de fatigue.",
    ],
    "medium": [
        "Votre stress a augmenté pendant la simulation — identifiez les moments où ARIA a le plus influencé votre rythme.",
        "En contexte réel, des notifications managériales répétées peuvent reproduire cette montée de pression.",
        "Fixez des créneaux sans interruption pour les tâches cognitives exigeantes.",
        "Parlez de vos limites de charge avec votre manager avant qu'elle ne devienne critique.",
    ],
    "high": [
        "Score élevé : cette simulation montre les effets de la pression algorithmique sur le bien-être au travail.",
        "En entreprise, un suivi permanent par IA managériale peut générer un stress chronique similaire.",
        "Demandez des garde-fous éthiques sur l'usage des outils de surveillance et de productivité.",
        "Envisagez des pauses actives et un débriefing d'équipe après les périodes de pic.",
        "Cette mesure n'est pas un diagnostic médical — consultez un professionnel si le stress persiste.",
    ],
}


def _recommendation_tier(score: int) -> str:
    if score < 40:
        return "low"
    if score < 70:
        return "medium"
    return "high"


def _parse_recommendations(text: str) -> list[str]:
    lines = []
    for line in text.split("\n"):
        cleaned = line.strip().lstrip("-•0123456789.) ")
        if len(cleaned) > 15:
            lines.append(cleaned)
    return lines[:5]


async def generate_recommendations(
    session: WorkSession,
    scores: dict,
    stress_score: int,
) -> list[str]:
    tier = _recommendation_tier(stress_score)
    system = """Tu es ARIA, IA managériale dans une simulation académique ESPRIT sur le stress au travail.
Génère exactement 4 recommandations courtes en français pour aider l'utilisateur après sa simulation.
Format : une recommandation par ligne, sans numérotation. Ton pédagogique, pas de diagnostic médical."""
    prompt = (
        f"Mode ARIA : {session.mode}. Score de stress numérique : {stress_score}/100 ({stress_score_label(stress_score)}).\n"
        f"Productivité : {scores['productivity']}%, charge cognitive : {scores['cognitive_load']}%, "
        f"fatigue : {scores['fatigue']}%, stress déclaré : {scores['declared_stress']}/10, "
        f"tâches : {scores['tasks_completed']}/{scores['tasks_total']}, durée : {scores['elapsed_minutes']} min."
    )
    try:
        reply, _ = await complete_llm(system, prompt)
        if reply:
            parsed = _parse_recommendations(reply)
            if parsed:
                return parsed
    except Exception as exc:
        logger.warning("Recommandations LLM indisponibles : %s", exc)
    return MOCK_RECOMMENDATIONS[tier]


def build_report_payload(db: Session, session: WorkSession, user: User | None = None) -> dict:
    metrics = compute_session_metrics(db, session)
    scores = metrics["current"]
    stress_score = session.stress_score
    if stress_score is None:
        stress_score = compute_global_stress_score(scores, session.mode)

    recommendations: list[str] = []
    if session.recommendations:
        try:
            recommendations = json.loads(session.recommendations)
        except json.JSONDecodeError:
            recommendations = []

    elapsed = elapsed_minutes_since(session.started_at)
    if session.ended_at and session.started_at:
        started = session.started_at
        ended = session.ended_at
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        if ended.tzinfo is None:
            ended = ended.replace(tzinfo=timezone.utc)
        elapsed = round((ended - started).total_seconds() / 60.0, 1)

    behavior = parse_behavior_analysis(session.behavior_analysis)

    return {
        "session_id": session.id,
        "display_name": session.display_name,
        "mode": session.mode,
        "mode_label": MODE_LABELS.get(session.mode, session.mode),
        "phase": session.phase,
        "phase_label": PHASE_LABELS.get(session.phase, session.phase),
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        "elapsed_minutes": elapsed,
        "stress_score": stress_score,
        "stress_label": stress_score_label(stress_score),
        "metrics": scores,
        "stress_series": metrics["stress_series"],
        "history": metrics["history"],
        "recommendations": recommendations,
        "behavior_analysis": behavior,
        "badges_earned": get_user_badges(user) if user else [],
        "disclaimer": "Cette simulation ne constitue pas un diagnostic médical. Les mesures sont indicatives.",
    }


async def close_session(db: Session, session_id: str, user: User) -> dict:
    session = get_session(db, session_id, user)

    if session.ended_at and session.stress_score is not None:
        return build_report_payload(db, session, user)

    scores = compute_current_scores(db, session)
    stress_score = compute_global_stress_score(scores, session.mode)
    recommendations = await generate_recommendations(session, scores, stress_score)
    behavior = await generate_behavior_analysis(db, session)

    session.ended_at = datetime.now(timezone.utc)
    session.phase = "debriefing"
    session.stress_score = stress_score
    session.recommendations = json.dumps(recommendations, ensure_ascii=False)
    session.behavior_analysis = json.dumps(behavior, ensure_ascii=False)
    db.commit()
    db.refresh(session)

    earned = award_badges(db, user, session, scores, stress_score)

    payload = build_report_payload(db, session, user)
    payload["badges_earned"] = earned
    return payload


def get_session_report(db: Session, session_id: str, user: User) -> dict:
    session = get_session(db, session_id, user)
    if not session.ended_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session non terminée — clôturez-la d'abord",
        )
    return build_report_payload(db, session, user)


def generate_pdf(report: dict) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2 * cm, bottomMargin=2 * cm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("Title", parent=styles["Heading1"], fontSize=18, spaceAfter=12)
    heading = ParagraphStyle("Heading", parent=styles["Heading2"], fontSize=13, spaceAfter=8)
    body = ParagraphStyle("Body", parent=styles["Normal"], fontSize=10, leading=14)

    story = []
    story.append(Paragraph("Rapport de simulation — AI Work Stress Simulator", title_style))
    story.append(Paragraph("ESPRIT — Sensibilisation à l'aliénation numérique", body))
    story.append(Spacer(1, 0.5 * cm))

    info = [
        ["Participant", report["display_name"]],
        ["Mode ARIA", report["mode_label"]],
        ["Durée", f"{report['elapsed_minutes']} min"],
        ["Score de stress", f"{report['stress_score']}/100 ({report['stress_label']})"],
    ]
    table = Table(info, colWidths=[5 * cm, 11 * cm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#1e293b")),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.whitesmoke),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 0.6 * cm))

    story.append(Paragraph("Métriques comportementales", heading))
    metrics = report["metrics"]
    metric_rows = [
        ["Productivité", f"{metrics['productivity']}%"],
        ["Charge cognitive", f"{metrics['cognitive_load']}%"],
        ["Fatigue", f"{metrics['fatigue']}%"],
        ["Stress déclaré", f"{metrics['declared_stress']}/10"],
        ["Tâches accomplies", f"{metrics['tasks_completed']}/{metrics['tasks_total']}"],
    ]
    mtable = Table(metric_rows, colWidths=[5 * cm, 11 * cm])
    mtable.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.append(mtable)
    story.append(Spacer(1, 0.6 * cm))

    story.append(Paragraph("Recommandations ARIA", heading))
    for rec in report.get("recommendations", []):
        story.append(Paragraph(f"• {rec}", body))
        story.append(Spacer(1, 0.15 * cm))

    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph(report["disclaimer"], ParagraphStyle("Disclaimer", parent=body, fontSize=8, textColor=colors.grey)))

    doc.build(story)
    return buffer.getvalue()
