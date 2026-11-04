"""
FieldSight — FastAPI backend
Endpoints: /api/upload, /api/jobs/{id}/status, /api/jobs/{id}/results, /api/chat, /api/health
"""
import os
import uuid
import json
from typing import Dict, Any, Optional

import aiofiles
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from google import genai as google_genai
from google.genai import types

from config import settings
from db.models import JobStatus, JobResults, Summary
from db.supabase_client import upsert_job
from jobs.worker import process_video

app = FastAPI(title="FieldSight API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # dev: allow all — tighten for production
    allow_credentials=False,      # must be False when allow_origins="*"
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store — primary source of truth; Supabase is the durable backup
jobs: Dict[str, Dict[str, Any]] = {}

MEDIA_DIR = "/tmp/loadsent"
os.makedirs(MEDIA_DIR, exist_ok=True)
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

# ─── Health ──────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    from db.supabase_client import supabase
    return {
        "status": "ok",
        "supabase": "connected" if supabase else "local-mode",
    }

# ─── Upload ───────────────────────────────────────────────────────────────────

@app.post("/api/upload")
async def upload_video(
    background_tasks: BackgroundTasks, 
    video: UploadFile = File(...),
    alert_email: Optional[str] = Form(None)
):
    filename = (video.filename or "").lower()
    if not any(filename.endswith(ext) for ext in (".mp4", ".mov", ".avi")):
        raise HTTPException(status_code=400, detail="Only mp4, mov, and avi files are accepted.")

    clean_email = alert_email.strip() if alert_email and alert_email.strip() else None

    job_id  = str(uuid.uuid4())
    job_dir = os.path.join(MEDIA_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    file_path = os.path.join(job_dir, "input.mp4")

    # Stream-write to disk
    async with aiofiles.open(file_path, "wb") as f:
        while chunk := await video.read(1024 * 1024):  # 1 MB chunks
            await f.write(chunk)

    # Initialise in-memory entry
    jobs[job_id] = {
        "status":        "pending",
        "stage":         "uploading",
        "progress":      0,
        "error":         None,
        "tracks":        [],
        "events":        [],
        "results":       None,
        "stage_timings": {},
        "alert_email":   clean_email,
        "email_sent":    False,
        "filename":      video.filename or "footage.mp4",
    }

    # Persist initial job row to Supabase (best-effort)
    upsert_job(job_id, status="pending", stage="uploading", progress=0, alert_email=clean_email)

    # Start async pipeline
    background_tasks.add_task(process_video, job_id, file_path, jobs)

    return {"job_id": job_id, "alert_email": clean_email}

# ─── Status ───────────────────────────────────────────────────────────────────

@app.get("/api/jobs/{job_id}/status", response_model=JobStatus)
def get_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found.")
    j = jobs[job_id]
    return JobStatus(
        job_id=job_id,
        status=j["status"],
        stage=j["stage"],
        progress=j["progress"],
        error=j.get("error"),
        stage_timings=j.get("stage_timings"),
        alert_email=j.get("alert_email"),
        email_sent=j.get("email_sent", False),
    )

# ─── Results ──────────────────────────────────────────────────────────────────

@app.get("/api/jobs/{job_id}/results", response_model=JobResults)
def get_results(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found.")
    j = jobs[job_id]
    if j["status"] == "error":
        raise HTTPException(status_code=500, detail=f"Job failed: {j.get('error')}")
    
    # Allow partial results — return whatever is available
    if j["results"] is not None:
        res = j["results"]
        res.alert_email = j.get("alert_email")
        res.email_sent = j.get("email_sent", False)
        return res
        
    # Build partial results from available events
    if j["status"] == "processing" and j.get("events"):
        events = j.get("events", [])
        
        by_risk = {"low": 0, "medium": 0, "high": 0, "critical": 0}
        behaviour_counts = {}
        for e in events:
            if e.risk_level in by_risk:
                by_risk[e.risk_level] += 1
            behaviour_counts[e.behaviour_label] = behaviour_counts.get(e.behaviour_label, 0) + 1
            
        most_frequent = max(behaviour_counts, key=behaviour_counts.get) if behaviour_counts else "None detected"
            
        summary = Summary(
            total_events=len(events),
            by_risk=by_risk,
            most_frequent_behaviour=most_frequent,
            events_prevented_estimate=max(1, int(len(events) * 1.5)) if events else 0,
            video_duration_seconds=0.0,
        )
        
        return JobResults(
            job_id=job_id,
            video_url=f"/media/{job_id}/input.mp4",
            duration_seconds=0.0,
            events=events,
            tracks=j.get("tracks", []),
            summary=summary,
            alert_email=j.get("alert_email"),
            email_sent=j.get("email_sent", False),
        )
        
    raise HTTPException(status_code=400, detail="Job is still processing.")

# ─── Chat ─────────────────────────────────────────────────────────────────────

@app.post("/api/chat")
async def chat(job_id: str = Body(...), message: str = Body(...)):
    events = jobs[job_id].get("events", []) if job_id in jobs else []

    if not events:
        return {
            "response": (
                "No event data is available for this session. "
                "This can happen if the server was restarted after processing. "
                "Re-upload the video to restore the session."
            )
        }

    # Serialise events as structured context (cap at 5000 chars)
    events_summary = []
    for e in events:
        if isinstance(e, dict):
            t_start = e.get("timestamp_start", 0.0)
            t_end = e.get("timestamp_end", 0.0)
            b_label = e.get("behaviour_label", "")
            r_level = e.get("risk_level", "low")
            r_score = e.get("risk_score", 0.0)
            exp = e.get("explanation", "")
            conf = e.get("confidence_tier", "observed_behaviour")
            tid = e.get("track_id")
        else:
            t_start = e.timestamp_start
            t_end = e.timestamp_end
            b_label = e.behaviour_label
            r_level = e.risk_level
            r_score = e.risk_score
            exp = e.explanation
            conf = e.confidence_tier
            tid = e.track_id

        events_summary.append({
            "timestamp": f"{float(t_start):.1f}s – {float(t_end):.1f}s",
            "behaviour": b_label,
            "risk_level": r_level,
            "risk_score": round(float(r_score), 1),
            "explanation": exp,
            "confidence": conf,
            "track_id": tid,
        })

    context_json = json.dumps(events_summary, indent=2)
    if len(context_json) > 5000:
        context_json = context_json[:5000] + "\n... (truncated for token budget)"

    system_prompt = f"""You are the AI Supervisor Assistant for FieldSight, a warehouse safety platform.
You have been given structured data about safety events detected in the current video footage.

DETECTED EVENTS (your ONLY source of truth — do not invent numbers):
{context_json}

Rules:
- Answer ONLY from the events data above. If the answer isn't in the data, say so clearly.
- Frame everything around risk prevention, not blame.
- Use exact timestamps and risk levels from the data when citing specific events.
- Keep responses concise and actionable — this is an ops tool, not a chatbot.
- Never assert "confirmed damage" — always say "potential damage" or "risk of damage".
- NEVER use asterisks (* or **). Do not use bold asterisks, italics, or star bullets. Output clean, readable plain text only.

User question: {message}"""

    try:
        client = google_genai.Client(api_key=settings.GEMINI_API_KEY)
        resp = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=system_prompt,
            config=types.GenerateContentConfig(
                automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
            ),
        )
        cleaned_text = (resp.text or "").replace("**", "").replace("*", "")
        return {"response": cleaned_text}
    except Exception as e:
        return {"response": f"AI assistant error: {str(e)}"}
