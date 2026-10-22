"""LLM client wrapper for the explanation layer.

Provider priority: Groq (GROQ_API_KEY), then xAI Grok (XAI_API_KEY), then
OpenAI. Groq and xAI both expose OpenAI-compatible APIs.
"""

import logging

from openai import OpenAI

from app.config import get_settings

logger = logging.getLogger(__name__)

_client: OpenAI | None = None


def _provider() -> tuple[str, str, str | None] | None:
    """Return (api_key, model, base_url) for the configured provider, or None."""
    settings = get_settings()
    if settings.groq_api_key:
        return settings.groq_api_key, settings.groq_model, settings.groq_base_url
    if settings.xai_api_key:
        return settings.xai_api_key, settings.xai_model, settings.xai_base_url
    if settings.openai_api_key and not settings.openai_api_key.startswith("sk-your"):
        return settings.openai_api_key, settings.openai_model, None
    return None


def get_openai_client() -> OpenAI | None:
    global _client
    provider = _provider()
    if provider is None:
        return None
    if _client is None:
        api_key, _, base_url = provider
        # Long STR narratives can take well over 15s to generate
        _client = OpenAI(api_key=api_key, base_url=base_url, timeout=90.0)
    return _client


def chat_completion(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.3,
    max_tokens: int = 1024,
) -> str | None:
    """Send a chat completion request to the configured LLM. Returns None if no API key is configured or on error."""
    client = get_openai_client()
    if client is None:
        return None

    try:
        _, model, _ = _provider()
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        if response.choices:
            return response.choices[0].message.content
        return None
    except Exception as exc:
        logger.warning("LLM API call failed: %s", exc)
        return None
