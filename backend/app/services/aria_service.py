import logging

from sqlalchemy.orm import Session

from app.models.session import WorkSession
from app.services.aria_prompts import MOCK_REPLIES, PERSONALITY_TRAITS, PHASE_BEHAVIOR, WELCOME_MESSAGES
from app.services.chat_service import build_session_context, save_message
from app.services.llm_client import complete_llm, get_llm_status

logger = logging.getLogger(__name__)


def get_aria_status() -> dict:
    return get_llm_status()


def get_welcome_message(session: WorkSession) -> str:
    template = WELCOME_MESSAGES.get(session.mode, WELCOME_MESSAGES["bienveillante"])
    return template.format(name=session.display_name)


def _build_system_prompt(session: WorkSession, context: dict) -> str:
    personality = PERSONALITY_TRAITS.get(session.mode, PERSONALITY_TRAITS["bienveillante"])
    phase_hint = PHASE_BEHAVIOR.get(session.phase, PHASE_BEHAVIOR["accueil"])
    return f"""Tu es ARIA, une IA managériale dans une simulation de stress au travail (projet académique ESPRIT).
{personality}
{phase_hint}
Réponds en français, 2-4 phrases maximum. Pas de listes longues.
Contexte actuel :
- Phase : {context['phase']}
- Tâches : {context['tasks_completed']}/{context['tasks_total']} terminées
- Stress déclaré : {context['stress_level']}/10
- Temps écoulé : {context['elapsed_minutes']} min
Ne fais pas de diagnostic médical."""


def _mock_reply(session: WorkSession, user_message: str | None = None, llm_failed: bool = False) -> str:
    mode_replies = MOCK_REPLIES.get(session.mode, MOCK_REPLIES["bienveillante"])
    base = mode_replies.get(session.phase, mode_replies["accueil"])
    if llm_failed:
        status = get_llm_status()
        return f"[IA indisponible — {status['detail']}] {base}"
    return base


async def generate_aria_reply(
    db: Session,
    session: WorkSession,
    user_message: str | None = None,
    proactive: bool = False,
) -> str:
    context = build_session_context(db, session)

    prompt = user_message or "Envoie un message proactif de suivi à l'employé."
    if proactive:
        prompt = "Envoie un message proactif bref pour relancer l'employé sans attendre sa réponse."

    system = _build_system_prompt(session, context)
    reply, provider = await complete_llm(system, prompt)

    if reply:
        return reply
    return _mock_reply(session, user_message, llm_failed=True)


async def create_aria_message(
    db: Session,
    session: WorkSession,
    user_message: str | None = None,
    proactive: bool = False,
) -> dict:
    content = await generate_aria_reply(db, session, user_message, proactive)
    msg = save_message(db, session.id, "aria", content)
    from app.services.chat_service import message_to_dict

    return message_to_dict(msg)


def send_welcome(db: Session, session: WorkSession) -> dict:
    content = get_welcome_message(session)
    msg = save_message(db, session.id, "aria", content)
    from app.services.chat_service import message_to_dict

    return message_to_dict(msg)
