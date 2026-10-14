"""Claude-powered IELTS helpers: Speaking, Writing, Listening, Reading.

All model calls go through the official Anthropic Python SDK.
"""
from __future__ import annotations

import os
from typing import Literal

import anthropic
from dotenv import load_dotenv
from pydantic import BaseModel, Field

load_dotenv()

MODEL = os.getenv("ANTHROPIC_MODEL", "claude-opus-5-5")

# The client resolves ANTHROPIC_API_KEY from the environment automatically.
client = anthropic.Anthropic()


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
    resp = client.messages.create(
        model=MODEL,
        max_tokens=2000,
        # Thinking is always on for Opus 5.5; low effort keeps live replies fast.
        output_config={"effort": "low"},
        system=_SPEAKING_SYSTEM.format(part=part),
        messages=messages,
    )
    return "".join(b.text for b in resp.content if b.type == "text").strip()


_SPEAKING_ASSESS_SYSTEM = """You are an experienced IELTS Speaking examiner.
Assess the candidate's performance in the transcript below using the four official criteria:
Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, and Pronunciation.

Notes:
- The candidate side is transcribed speech; judge Pronunciation cautiously and say it is an estimate.
- Be fair but honest. Use the real IELTS 0-9 band scale in 0.5 steps.
- Give concrete, actionable advice and a few 'you said X -> better: Y' rewrites."""


def speaking_assess(messages: list[dict]) -> dict:
    transcript = _messages_to_transcript(messages, you_role="Candidate", them_role="Examiner")
    resp = client.messages.parse(
        model=MODEL,
        max_tokens=3000,
        thinking={"type": "adaptive"},
        system=_SPEAKING_ASSESS_SYSTEM,
        messages=[{"role": "user", "content": f"Transcript:\n\n{transcript}"}],
        output_format=BandFeedback,
    )
    return resp.parsed_output.model_dump()


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
    resp = client.messages.parse(
        model=MODEL,
        max_tokens=4000,
        thinking={"type": "adaptive"},
        system=_WRITING_ASSESS_SYSTEM,
        messages=[{"role": "user", "content": user}],
        output_format=BandFeedback,
    )
    return resp.parsed_output.model_dump()


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
    resp = client.messages.parse(
        model=MODEL,
        max_tokens=6000,
        thinking={"type": "adaptive"},
        messages=[{"role": "user", "content": user}],
        output_format=ReadingPassage,
    )
    return resp.parsed_output.model_dump()


def listening_generate(level: str, topic: str | None = None) -> dict:
    topic_line = f"Topic hint: {topic}." if topic else "Choose a realistic everyday or academic scenario."
    user = (
        f"Create an IELTS Listening practice at level '{level}'. {topic_line} "
        "Write a natural spoken transcript (a monologue or a short dialogue) of ~200-350 words "
        "that will be read aloud by text-to-speech, then 6-8 questions mixing types "
        "(mcq, tf, gap). Questions must be answerable only from the transcript. "
        "Do NOT include stage directions like [pause]; write it as it should be spoken."
    )
    resp = client.messages.parse(
        model=MODEL,
        max_tokens=6000,
        thinking={"type": "adaptive"},
        messages=[{"role": "user", "content": user}],
        output_format=ListeningExercise,
    )
    return resp.parsed_output.model_dump()


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
