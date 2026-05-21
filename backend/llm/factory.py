import os
from .base import LLMProvider


def get_provider() -> LLMProvider:
    provider = os.getenv("LLM_PROVIDER", "claude").lower()

    if provider == "claude":
        from .claude import ClaudeProvider
        return ClaudeProvider(
            api_key=os.getenv("ANTHROPIC_API_KEY", ""),
            model=os.getenv("ANTHROPIC_MODEL", "claude-opus-4-7"),
        )

    if provider == "openai":
        from .openai_provider import OpenAIProvider
        return OpenAIProvider(
            api_key=os.getenv("OPENAI_API_KEY", ""),
            model=os.getenv("OPENAI_MODEL", "gpt-4o"),
        )

    raise ValueError(f"Unknown LLM_PROVIDER '{provider}'. Use 'claude' or 'openai'.")
