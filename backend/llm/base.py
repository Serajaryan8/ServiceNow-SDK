from abc import ABC, abstractmethod
from typing import AsyncIterator


class LLMProvider(ABC):
    @abstractmethod
    async def stream(self, system: str, messages: list[dict]) -> AsyncIterator[str]:
        ...
