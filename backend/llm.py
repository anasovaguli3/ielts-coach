"""AI-powered IELTS helpers: Speaking, Writing, Listening, Reading.

Two providers are supported, chosen by which key is set in the environment:
- GEMINI_API_KEY    -> Google Gemini (has a free tier; used for the public demo)
- ANTHROPIC_API_KEY -> Claude (paid, higher quality)
Every feature goes through two helpers, _chat() and _structured(), so the
rest of the file does not care which provider is active.
"""
from __future__ import annotations

import os
from typing import Literal, TypeVar

from dotenv import load_dotenv
from pydantic import BaseModel, Field

load_dotenv()

if os.getenv("GEMINI_API_KEY"):
    from google import genai
    from google.genai import types

    PROVIDER = "gemini"
    MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")
    gemini = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
else:
    import anthropic

    PROVIDER = "claude"
    MODEL = os.getenv("ANTHROPIC_MODEL", "claude-opus-5-5")
    # The client resolves ANTHROPIC_API_KEY from the environment automatically.
    claude = anthropic.Anthropic()

T = TypeVar("T", bound=BaseModel)

# Gemini counts its hidden "thinking" tokens inside max_output_tokens, so give
# it headroom on top of the visible-answer budget.
_GEMINI_THINKING_HEADROOM = 8192


def key_set() -> bool:
    return bool(os.getenv("GEMINI_API_KEY") or os.getenv("ANTHROPIC_API_KEY"))


def _chat(system: str, messages: list[dict], max_tokens: int) -> str:
    """Plain-text reply to a conversation of {role, content} turns."""
    if PROVIDER == "gemini":
        contents = [
            types.Content(
                role="model" if m["role"] == "assistant" else "user",
                parts=[types.Part(text=m["content"])],
            )
            for m in messages
        ]
        resp = gemini.models.generate_content(
            model=MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system,
                max_output_tokens=max_tokens + _GEMINI_THINKING_HEADROOM,
            ),
        )
        return (resp.text or "").strip()

    resp = claude.messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        # Thinking is always on for Opus 5.5; low effort keeps live replies fast.
        output_config={"effort": "low"},
        system=system,
        messages=messages,
    )
    return "".join(b.text for b in resp.content if b.type == "text").strip()


def _structured(system: str | None, user: str, schema: type[T], max_tokens: int) -> dict:
    """Ask for a JSON answer that matches a Pydantic schema; return it as a dict."""
    if PROVIDER == "gemini":
        resp = gemini.models.generate_content(
            model=MODEL,
            contents=user,
            config=types.GenerateContentConfig(
                system_instruction=system,
                max_output_tokens=max_tokens + _GEMINI_THINKING_HEADROOM,
                response_mime_type="application/json",
                response_schema=schema,
            ),
        )
        parsed = resp.parsed if isinstance(resp.parsed, schema) else schema.model_validate_json(resp.text)
        return parsed.model_dump()

    kwargs = {"system": system} if system else {}
    resp = claude.messages.parse(
        model=MODEL,
        max_tokens=max_tokens,
        thinking={"type": "adaptive"},
        messages=[{"role": "user", "content": user}],
        output_format=schema,
        **kwargs,
    )
    return resp.parsed_output.model_dump()


# --------------------------------------------------------------------------- #
# Structured output models
# --------------------------------------------------------------------------- #
class CriterionScore(BaseModel):
    name: str = Field(description="IELTS criterion name")
    band: float = Field(description="Band for this criterion, 0-9 in 0.5 steps")
    comment: str = Field(description="Short, specific comment on this criterion")


class BandFeedback(BaseModel):
    overall_band: float = Field(description="Estimated overall band, 0-9")
    criteria: list[CriterionScore]
    strengths: list[str] = Field(description="2-4 concrete strengths")
    improvements: list[str] = Field(description="3-5 actionable improvements")
    corrected_examples: list[str] = Field(
        default_factory=list,
        description="A few 'you said X -> better: Y' rewrites",
    )
    summary: str = Field(description="One short encouraging paragraph")


class Question(BaseModel):
    id: int
    type: Literal["mcq", "tf", "gap"] = Field(
        description="mcq = multiple choice, tf = true/false/not given, gap = fill the gap"
    )
    prompt: str = Field(description="The question text")
    options: list[str] = Field(
        default_factory=list, description="Choices for mcq/tf; empty for gap"
    )
    answer: str = Field(description="The correct answer (exact option text or word)")
    explanation: str = Field(description="Why this is the answer, one sentence")


class ReadingPassage(BaseModel):
    title: str
    passage: str = Field(description="~400-600 word academic-style passage")
    questions: list[Question]


class ListeningExercise(BaseModel):
    title: str
    transcript: str = Field(
        description="A natural spoken monologue/dialogue to be read aloud, ~200-350 words"
    )
    questions: list[Question]


# --------------------------------------------------------------------------- #
# Speaking
# --------------------------------------------------------------------------- #
_SPEAKING_SYSTEM = """You are a friendly, professional IELTS Speaking examiner having a live spoken conversation.

Current section: IELTS Speaking Part {part}.
- Part 1: familiar topics (home, work, studies, hobbies). Short, warm questions.
- Part 2: the candidate speaks for 1-2 minutes on a cue card. Give ONE cue card the first time, then let them talk and ask a short follow-up.
- Part 3: abstract discussion linked to the Part 2 topic. Deeper, opinion-based questions.

Rules:
- Ask ONE question at a time and keep it natural and conversational, like a real examiner.
- Never grade or correct the candidate mid-conversation. Just react naturally and move on.
- Keep your turns short (1-3 sentences). Do not lecture.
- Match a real IELTS test in tone: polite, neutral, encouraging.
- The candidate's messages are transcribed speech, so ignore small transcription errors.
Reply with ONLY your spoken turn — no labels, no meta text."""


def speaking_reply(part: int, messages: list[dict]) -> str:
    """Return the examiner's next spoken turn."""
    return _chat(_SPEAKING_SYSTEM.format(part=part), messages, max_tokens=2000)


_SPEAKING_ASSESS_SYSTEM = """You are an experienced IELTS Speaking examiner.
Assess the candidate's performance in the transcript below using the four official criteria:
Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, and Pronunciation.

Notes:
- The candidate side is transcribed speech; judge Pronunciation cautiously and say it is an estimate.
- Be fair but honest. Use the real IELTS 0-9 band scale in 0.5 steps.
- Give concrete, actionable advice and a few 'you said X -> better: Y' rewrites."""


def speaking_assess(messages: list[dict]) -> dict:
    transcript = _messages_to_transcript(messages, you_role="Candidate", them_role="Examiner")
    return _structured(_SPEAKING_ASSESS_SYSTEM, f"Transcript:\n\n{transcript}", BandFeedback, max_tokens=3000)


# --------------------------------------------------------------------------- #
# Writing
# --------------------------------------------------------------------------- #
_WRITING_ASSESS_SYSTEM = """You are an experienced IELTS Writing examiner.
Assess the essay using the four official criteria for the given task.

Task 1 criteria: Task Achievement, Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy.
Task 2 criteria: Task Response, Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy.

Use the real IELTS 0-9 band scale in 0.5 steps. Be fair but honest.
Give concrete corrections and a few 'you wrote X -> better: Y' rewrites."""


def writing_assess(task: int, prompt: str, essay: str) -> dict:
    user = (
        f"IELTS Writing Task {task}.\n\n"
        f"Question / prompt:\n{prompt}\n\n"
        f"Candidate's essay:\n{essay}"
    )
    return _structured(_WRITING_ASSESS_SYSTEM, user, BandFeedback, max_tokens=4000)


# --------------------------------------------------------------------------- #
# Reading & Listening generation
# --------------------------------------------------------------------------- #
def reading_generate(level: str, topic: str | None = None) -> dict:
    topic_line = f"Topic hint: {topic}." if topic else "Choose an interesting academic topic."
    user = (
        f"Create an IELTS Academic Reading practice at CEFR/IELTS level '{level}'. "
        f"{topic_line} "
        "Write a 400-600 word passage, then 6-8 questions mixing types "
        "(mcq, tf = True/False/Not Given, gap = fill in one word). "
        "Make questions answerable strictly from the passage."
    )
    return _structured(None, user, ReadingPassage, max_tokens=6000)


def listening_generate(level: str, topic: str | None = None) -> dict:
    topic_line = f"Topic hint: {topic}." if topic else "Choose a realistic everyday or academic scenario."
    user = (
        f"Create an IELTS Listening practice at level '{level}'. {topic_line} "
        "Write a natural spoken transcript (a monologue or a short dialogue) of ~200-350 words "
        "that will be read aloud by text-to-speech, then 6-8 questions mixing types "
        "(mcq, tf, gap). Questions must be answerable only from the transcript. "
        "Do NOT include stage directions like [pause]; write it as it should be spoken."
    )
    return _structured(None, user, ListeningExercise, max_tokens=6000)


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _messages_to_transcript(messages: list[dict], you_role: str, them_role: str) -> str:
    lines = []
    for m in messages:
        who = you_role if m["role"] == "user" else them_role
        content = m["content"]
        if isinstance(content, list):
            content = " ".join(c.get("text", "") for c in content if isinstance(c, dict))
        lines.append(f"{who}: {content}")
    return "\n".join(lines)
