from typing import AsyncIterator
import anthropic
from .base import LLMProvider


class ClaudeProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "claude-opus-4-7"):
        self.client = anthropic.AsyncAnthropic(api_key=api_key)
        self.model = model

    async def stream(self, system: str, messages: list[dict]) -> AsyncIterator[str]:
        async with self.client.messages.stream(
            model=self.model,
            max_tokens=8096,
            system=system,
            messages=messages,
        ) as s:
            async for chunk in s.text_stream:
                yield chunk
