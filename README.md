---
title: IELTS Coach
emoji: 🎓
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# IELTS Coach 🎓

An AI-powered IELTS preparation platform covering all four skills:

- **🎙️ Speaking** — a live conversation with an AI examiner using your microphone
  (browser speech-to-text) and voice replies (text-to-speech). Parts 1–3, then a
  band-scored assessment.
- **✍️ Writing** — submit Task 1 or Task 2 essays and get feedback scored against
  the four official IELTS criteria.
- **🎧 Listening** — generate fresh audio exercises (read aloud by the browser),
  answer, and check yourself.
- **📖 Reading** — academic passages with True/False/Not Given, multiple-choice
  and gap-fill questions.

Bilingual interface (English / O‘zbekcha) — toggle with the **UZ/EN** button.

## Tech stack

- **Backend:** Python + FastAPI. Pluggable LLM provider: **Google Gemini** (free tier,
  used by the public demo) or **Claude** (Anthropic SDK) — chosen by which API key is set.
  Structured outputs are validated with Pydantic schemas.
- **Frontend:** plain HTML/CSS/JS — no build step.
- **Speech:** the browser's Web Speech API (SpeechRecognition + SpeechSynthesis).
  Works best in Chrome / Edge.

## Setup

1. Install Python dependencies:

   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. Add an API key (Gemini is free — https://aistudio.google.com/apikey):

   ```bash
   cp .env.example .env
   # then edit .env: set GEMINI_API_KEY (free) or ANTHROPIC_API_KEY
   ```

3. Run the server (from the `backend` folder):

   ```bash
   uvicorn main:app --reload --port 8000
   ```

4. Open **http://localhost:8000** in Chrome.

The FastAPI server serves both the API (`/api/*`) and the frontend, so a single
command runs everything.

## Notes

- The default model is `claude-opus-5-5`. Set `ANTHROPIC_MODEL` in `.env` to use a
  cheaper/faster model (e.g. `claude-sonnet-5-5` or `claude-haiku-5-5`).
- Microphone access requires `http://localhost` or HTTPS.
- Reading/Listening exercises are freshly generated each time, so no two are alike.
