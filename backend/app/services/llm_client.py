import asyncio
import logging
import time
from typing import Literal

import httpx
from anthropic import Anthropic, APIStatusError

from app.core.config import settings

logger = logging.getLogger(__name__)

Provider = Literal["gemini", "groq", "ollama", "anthropic", "mock"]

_blocked_providers: set[str] = set()
_block_reasons: dict[str, str] = {}
_last_error: str | None = None
_provider_cooldown_until: dict[str, float] = {}

AUTO_PROVIDER_ORDER: tuple[Provider, ...] = ("groq", "gemini", "ollama")
GEMINI_MODEL_FALLBACKS = ("gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash-002")


def _provider_enabled(name: Provider) -> bool:
    if name == "groq":
        return bool(settings.GROQ_API_KEY)
    if name == "gemini":
        return bool(settings.GEMINI_API_KEY)
    if name == "ollama":
        return settings.OLLAMA_ENABLED
    if name == "anthropic":
        return bool(settings.ANTHROPIC_API_KEY)
    return name == "mock"


def resolve_provider() -> Provider:
    explicit = settings.ARIA_PROVIDER.lower()
    if explicit in ("gemini", "groq", "ollama", "anthropic", "mock"):
        return explicit  # type: ignore[return-value]

    for name in AUTO_PROVIDER_ORDER:
        if _provider_enabled(name) and name not in _blocked_providers and not _provider_in_cooldown(name):
            return name
    return "mock"


def _providers_for_auto() -> list[Provider]:
    explicit = settings.ARIA_PROVIDER.lower()
    if explicit != "auto":
        if explicit == "mock":
            return ["mock"]
        if _provider_enabled(explicit) and explicit not in _blocked_providers:
            return [explicit]  # type: ignore[list-item]
        return []

    return [
        name
        for name in AUTO_PROVIDER_ORDER
        if _provider_enabled(name) and name not in _blocked_providers and not _provider_in_cooldown(name)
    ]


def _provider_in_cooldown(provider: str) -> bool:
    return time.time() < _provider_cooldown_until.get(provider, 0)


def _set_provider_cooldown(provider: str, seconds: int = 60) -> None:
    _provider_cooldown_until[provider] = time.time() + seconds


def llm_is_available() -> bool:
    return len(_providers_for_auto()) > 0


def get_llm_status() -> dict:
    provider = resolve_provider()
    if provider == "mock":
        if _last_error:
            return {"mode": "mock", "detail": _last_error}
        if settings.GEMINI_API_KEY or settings.GROQ_API_KEY:
            return {"mode": "mock", "detail": "Aucun fournisseur LLM disponible — vérifiez vos clés"}
        return {"mode": "mock", "detail": "Mode démo — ajoutez GROQ_API_KEY dans .env"}

    models = {
        "gemini": settings.GEMINI_MODEL,
        "groq": settings.GROQ_MODEL,
        "ollama": settings.OLLAMA_MODEL,
        "anthropic": settings.ARIA_MODEL,
    }
    return {"mode": provider, "detail": f"Modèle {models[provider]}"}


def _mark_blocked(provider: str, exc: Exception) -> None:
    global _last_error
    _blocked_providers.add(provider)
    message = _error_message(exc)
    _block_reasons[provider] = f"{provider}: {message}"
    _last_error = _block_reasons[provider]
    logger.error("LLM %s indisponible : %s", provider, message)


def _error_message(exc: Exception) -> str:
    if isinstance(exc, httpx.HTTPStatusError):
        try:
            body = exc.response.json()
            err = body.get("error", body)
            if isinstance(err, dict):
                msg = err.get("message") or err.get("status") or str(err)
                return f"{exc.response.status_code} — {msg}"[:200]
        except Exception:
            pass
        return f"{exc.response.status_code} — {exc.response.text[:120]}"
    text = str(exc)
    if "401" in text or "invalid authentication" in text.lower():
        return "401 — clé API invalide ou révoquée"
    if "404" in text and "not found" in text.lower():
        return "404 — modèle IA introuvable (vérifiez GEMINI_MODEL)"
    if "429" in text or "quota" in text.lower() or "rate limit" in text.lower():
        return "429 — quota dépassé, réessayez dans quelques minutes"
    return text[:200]


def _is_auth_error(exc: Exception) -> bool:
    if isinstance(exc, APIStatusError) and exc.status_code in (401, 403):
        return True
    if isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code in (401, 403):
        return True
    msg = str(exc).lower()
    return any(k in msg for k in ("invalid api key", "permission denied", "authentication", "invalid authentication"))


def _is_rate_limit(exc: Exception) -> bool:
    if isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code == 429:
        return True
    msg = str(exc).lower()
    return "429" in msg or "quota" in msg or "rate limit" in msg or "resource_exhausted" in msg


def _is_model_not_found(exc: Exception) -> bool:
    msg = str(exc).lower()
    return "404" in msg and ("not found" in msg or "not_found" in msg)


def _gemini_models() -> list[str]:
    models: list[str] = []
    for model in (settings.GEMINI_MODEL, *GEMINI_MODEL_FALLBACKS):
        if model and model not in models:
            models.append(model)
    return models


async def _call_gemini(system: str, user: str) -> str:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    last_exc: Exception | None = None

    for model in _gemini_models():
        def _generate(model_name: str = model) -> str:
            response = client.models.generate_content(
                model=model_name,
                contents=user,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    max_output_tokens=250,
                    temperature=0.7,
                ),
            )
            text = response.text
            if not text:
                raise RuntimeError("Réponse Gemini vide")
            return text.strip()

        try:
            return await asyncio.to_thread(_generate)
        except Exception as exc:
            if _is_model_not_found(exc):
                logger.warning("Modèle Gemini %s introuvable, essai suivant", model)
                last_exc = exc
                continue
            raise

    if last_exc:
        raise last_exc
    raise RuntimeError("Aucun modèle Gemini disponible")


async def _call_groq(system: str, user: str) -> str:
    payload = {
        "model": settings.GROQ_MODEL,
        "max_tokens": 250,
        "temperature": 0.7,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"].strip()


async def _call_ollama(system: str, user: str) -> str:
    payload = {
        "model": settings.OLLAMA_MODEL,
        "stream": False,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/chat", json=payload)
        response.raise_for_status()
        data = response.json()
        return data["message"]["content"].strip()


async def _call_anthropic(system: str, user: str) -> str:
    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = await asyncio.to_thread(
        client.messages.create,
        model=settings.ARIA_MODEL,
        max_tokens=250,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return response.content[0].text.strip()


async def _try_provider(provider: Provider, system: str, user: str) -> str | None:
    callers = {
        "gemini": _call_gemini,
        "groq": _call_groq,
        "ollama": _call_ollama,
        "anthropic": _call_anthropic,
    }
    if provider not in callers:
        return None

    try:
        return await callers[provider](system, user)
    except Exception as exc:
        global _last_error
        _last_error = _error_message(exc)

        if _is_auth_error(exc):
            _mark_blocked(provider, exc)
            return None

        if _is_rate_limit(exc):
            logger.warning("LLM %s quota dépassé", provider)
            _set_provider_cooldown(provider, 120)
            return None

        if _is_model_not_found(exc):
            logger.warning("LLM %s modèle introuvable", provider)
            return None

        logger.warning("LLM %s échec : %s", provider, _last_error)
        return None


async def complete_llm(system: str, user: str) -> tuple[str | None, Provider]:
    providers = _providers_for_auto()
    if not providers:
        return None, "mock"

    for provider in providers:
        text = await _try_provider(provider, system, user)
        if text:
            _last_error = None
            return text, provider

    if settings.ARIA_PROVIDER.lower() == "anthropic" and "anthropic" not in _blocked_providers:
        text = await _try_provider("anthropic", system, user)
        if text:
            _last_error = None
            return text, "anthropic"

    return None, "mock"
