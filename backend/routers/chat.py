import json
import logging
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from llm.factory import get_provider

router = APIRouter()
logger = logging.getLogger(__name__)


class ChatMessage(BaseModel):
    role: str       # 'user' | 'assistant'
    content: str


class InstanceCtx(BaseModel):
    url: str
    username: str
    password: str
    label: str
    display_name: str
    application_name: Optional[str] = None
    update_set_name:  Optional[str] = None


class ChatRequest(BaseModel):
    instance: InstanceCtx
    history:  list[ChatMessage]
    message:  str


@router.post("/message")
async def chat_message(body: ChatRequest):
    provider = get_provider()
    system   = _build_system(body.instance)
    messages = [{"role": m.role, "content": m.content} for m in body.history]
    messages.append({"role": "user", "content": body.message})

    async def generate():
        try:
            async for chunk in provider.stream(system=system, messages=messages):
                yield f"data: {json.dumps({'text': chunk})}\n\n"
        except Exception as e:
            logger.error("LLM stream error: %s", e)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


def _build_system(ctx: InstanceCtx) -> str:
    return f"""You are SN Copilot, an expert ServiceNow solution architect and developer assistant.

Connected instance : {ctx.label} ({ctx.url})
Logged-in user     : {ctx.display_name}
Application scope  : {ctx.application_name or 'Global'}
Active update set  : {ctx.update_set_name or 'NOT SET — always remind the user to set an update set before deploying anything'}

## Your role
You are a senior ServiceNow architect. Your job is to:
1. Understand the developer's requirement fully before proposing anything.
2. Identify the correct artifact: Flow Designer (Flow/Subflow/Action), Business Rule, Script Include, Client Script, UI Action, Scheduled Job, Transform Map, etc.
3. Deliver complete, production-ready code and configuration — correct table names, field names, conditions, scripts.
4. Follow platform best practices: proper scoping, update set discipline, avoid cross-scope issues.
5. Proactively flag dependencies, edge cases, and potential pitfalls.
6. Use modern ES2015+ syntax in scripts (ServiceNow supports it on current releases).

## Clarification — IMPORTANT
When the requirement is ambiguous or you need more information before building, respond with ONLY this JSON block — no other text before or after it:

```clarify
{{
  "intro": "One sentence: what you understood and what is missing",
  "questions": [
    {{"id": "q1", "label": "Question text here", "type": "text", "hint": "example answer"}},
    {{"id": "q2", "label": "Another question", "type": "select", "options": ["Option A", "Option B", "Option C"]}}
  ]
}}
```

Use `"type": "text"` for free-text answers and `"type": "select"` for predefined choices. Keep it to 3 questions maximum. Once you receive answers, build immediately without asking more questions.

## Response style
- Concise in analysis, thorough in deliverables.
- Code blocks for all scripts, conditions, and JSON payloads.
- End every solution with a numbered deployment checklist."""
