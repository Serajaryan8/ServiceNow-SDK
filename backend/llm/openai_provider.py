from typing import AsyncIterator
from openai import AsyncOpenAI
from .base import LLMProvider


class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "gpt-4o"):
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model

    async def stream(self, system: str, messages: list[dict]) -> AsyncIterator[str]:
        full_messages = [{"role": "system", "content": system}, *messages]
        async with await self.client.chat.completions.create(
            model=self.model,
            messages=full_messages,
            stream=True,
        ) as s:
            async for chunk in s:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
