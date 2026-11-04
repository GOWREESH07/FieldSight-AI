# FieldSight

> AI Video Intelligence for Warehouse Handling — from CCTV that records, to AI that intervenes.

FieldSight watches loading/unloading footage, understands the **sequence of actions** (not just objects), flags damage-causing behaviour, scores risk, and lets supervisors ask questions about what happened.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Next.js 14 App Router (TypeScript + Tailwind)                  │
│  Dark industrial UI — IBM Plex Sans + Mono                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼──────────────────────────────────────┐
│  FastAPI (Python)                                               │
│  ┌─────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │ YOLOv8n +   │  │ Gemini 2.0 Flash │  │   Risk Engine     │  │
│  │ ByteTrack   │→ │ (Multimodal VLM) │→ │ (4-factor score) │  │
│  └─────────────┘  └──────────────────┘  └───────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  Supabase                                                       │
│  Storage (videos) + Postgres (jobs, events, tracks)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- A Supabase project (or run in local/in-memory mode)
- Gemini API key

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env — add GEMINI_API_KEY (required), Supabase creds (optional)

uvicorn main:app --reload --port 8000
```

The backend starts in **local mode** if Supabase credentials aren't set — videos are stored in `/tmp/loadsent/` and data in memory. Fully functional for demos.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### 3. Supabase Setup (optional — needed for persistence across restarts)

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL Editor
3. Create a Storage bucket named `loadsent-videos` and set it to public
4. Add your `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` to `backend/.env`

### 4. Email Alerts (Resend API)

FieldSight collects supervisor emails before upload and dispatches a risk summary once computer vision processing finishes.

- Set `RESEND_API_KEY` in `backend/.env` to enable real email delivery via [Resend](https://resend.com).
- Without `RESEND_API_KEY`, the alert is logged directly to the backend console instead of sent, allowing the flow to be fully tested and demoed offline.

---

## Behaviour Taxonomy

| # | Behaviour | Severity |
|---|-----------|----------|
| 1 | Dropping / throwing product | **Critical** |
| 2 | Dragging product instead of equipment | **High** |
| 3 | Rough handling / excessive impact | **High** |
| 4 | Improper stacking (heavy-on-light) | **High** |
| 5 | Unstable / overloaded stacking | Medium |
| 6 | Product placed outside designated area | Medium |
| 7 | Product handled without required equipment | Medium |
| 8 | Incorrect pallet positioning / overhang | Medium |
| 9 | Rolling a product not designed to be rolled | Medium |
| 10 | Standing / stepping on cartons | **High** |
| 11 | Unsafe loading/unloading sequence | Low |
| 12 | Wet-floor / unsafe-surface handling | Medium |

## Risk Score Formula

```
risk_score = base_severity × height_factor × duration_factor × repeat_factor

base_severity  : 25 (low) / 50 (medium) / 75 (high) / 100 (critical)
height_factor  : 1.0 + min(0.5, estimated_drop_height_m × 0.25)
duration_factor: 1.0 + min(0.3, handling_duration_seconds / 30.0)
repeat_factor  : 1.2 if same behaviour seen >1× in session, else 1.0

Result clamped to [0, 100]. All factors shown in every event card.
```

## Responsible AI

FieldSight classifies every detection as:
- **Observed behaviour** — directly visible in frames
- **Potential risk** — inferred from context

It **never** asserts "confirmed damage" — that requires human review.

> This system flags handling behaviour for process improvement, not individual employee punishment.

## Sample Videos

Pilot footage is in `sample-videos/`. These are Godrej warehouse recordings covering all major taxonomy categories. Drop new videos via the Upload screen to analyze them.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.11 |
| CV Pipeline | YOLOv8n + ByteTrack (Ultralytics) |
| AI Reasoning | Gemini 2.0 Flash (Multimodal VLM) |
| Storage | Supabase Storage + PostgreSQL |
| Async Jobs | FastAPI BackgroundTasks |
| Fonts | IBM Plex Sans + IBM Plex Mono |
