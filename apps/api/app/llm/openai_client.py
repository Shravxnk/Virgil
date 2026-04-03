"""OpenAI client wrapper for the LLM-backed explanation layer."""

from openai import OpenAI
from app.config import get_settings

_client: OpenAI | None = None


def get_openai_client() -> OpenAI | None:
    global _client
    settings = get_settings()
    if not settings.openai_api_key or settings.openai_api_key.startswith("sk-your"):
        return None
    if _client is None:
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client


def chat_completion(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.3,
    max_tokens: int = 1024,
) -> str | None:
    """Send a chat completion request to OpenAI. Returns None if API key is not configured."""
    client = get_openai_client()
    if client is None:
        return None

    settings = get_settings()
    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content
