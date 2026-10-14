"""FastAPI app: serves the IELTS frontend and the Claude-powered API."""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import llm

app = FastAPI(title="IELTS Coach")

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


# --------------------------------------------------------------------------- #
# Request models
# --------------------------------------------------------------------------- #
class ChatTurn(BaseModel):
    role: str
    content: str


class SpeakingReplyReq(BaseModel):
    part: int = 1
    messages: list[ChatTurn]


class SpeakingAssessReq(BaseModel):
    messages: list[ChatTurn]


class WritingReq(BaseModel):
    task: int = 2
    prompt: str
    essay: str


class GenerateReq(BaseModel):
    level: str = "B2"
    topic: str | None = None


# --------------------------------------------------------------------------- #
# Health / config
# --------------------------------------------------------------------------- #
@app.get("/api/health")
def health():
    return {"ok": True, "model": llm.MODEL, "key_set": bool(os.getenv("ANTHROPIC_API_KEY"))}


# --------------------------------------------------------------------------- #
# Speaking
# --------------------------------------------------------------------------- #
@app.post("/api/speaking/reply")
def speaking_reply(req: SpeakingReplyReq):
    msgs = [t.model_dump() for t in req.messages]
    return {"reply": _guard(lambda: llm.speaking_reply(req.part, msgs))}


@app.post("/api/speaking/assess")
def speaking_assess(req: SpeakingAssessReq):
    msgs = [t.model_dump() for t in req.messages]
    return _guard(lambda: llm.speaking_assess(msgs))


# --------------------------------------------------------------------------- #
# Writing
# --------------------------------------------------------------------------- #
@app.post("/api/writing/assess")
def writing_assess(req: WritingReq):
    if not req.essay.strip():
        raise HTTPException(status_code=400, detail="Essay is empty.")
    return _guard(lambda: llm.writing_assess(req.task, req.prompt, req.essay))


# --------------------------------------------------------------------------- #
# Reading & Listening
# --------------------------------------------------------------------------- #
@app.post("/api/reading/generate")
def reading_generate(req: GenerateReq):
    return _guard(lambda: llm.reading_generate(req.level, req.topic))


@app.post("/api/listening/generate")
def listening_generate(req: GenerateReq):
    return _guard(lambda: llm.listening_generate(req.level, req.topic))


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _guard(fn):
    try:
        return fn()
    except Exception as exc:  # surface a clean error to the UI
        raise HTTPException(status_code=502, detail=f"AI error: {exc}") from exc


# Serve the frontend last, so /api/* routes take precedence.
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
