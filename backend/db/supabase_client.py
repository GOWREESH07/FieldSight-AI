"""
Supabase client — initialised once, used throughout the app.
All functions gracefully degrade if Supabase is not configured.
"""
import os
import logging
from typing import Optional
from supabase import create_client, Client
from config import settings

logger = logging.getLogger(__name__)

supabase: Optional[Client] = None

if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
    try:
        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        logger.info("✅ Supabase client initialised — %s", settings.SUPABASE_URL)
    except Exception as e:
        logger.warning("⚠️  Supabase init failed: %s — running in local-only mode.", e)
else:
    logger.warning("⚠️  Supabase credentials not set — running in local-only mode.")


# ─── Storage helpers ────────────────────────────────────────────────────────

def upload_video_to_storage(local_path: str, job_id: str) -> Optional[str]:
    """
    Upload video file to Supabase Storage.
    Returns the public URL, or None if Supabase not configured.
    """
    if not supabase:
        return None
    try:
        bucket = settings.SUPABASE_BUCKET
        object_path = f"{job_id}/input.mp4"
        with open(local_path, "rb") as f:
            supabase.storage.from_(bucket).upload(
                path=object_path,
                file=f,
                file_options={"content-type": "video/mp4", "upsert": "true"}
            )
        public_url = supabase.storage.from_(bucket).get_public_url(object_path)
        logger.info("✅ Video uploaded to Supabase Storage: %s", public_url)
        return public_url
    except Exception as e:
        logger.error("❌ Failed to upload video to Supabase: %s", e)
        return None


# ─── Database helpers ────────────────────────────────────────────────────────

def upsert_job(job_id: str, status: str, stage: str, progress: int,
               video_url: str = "", duration_seconds: float = 0.0,
               error_message: str = None, stage_timings: dict = None,
               alert_email: str = None):
    """Insert or update a job row in Postgres."""
    if not supabase:
        return
    try:
        data = {
            "id": job_id,
            "status": status,
            "stage": stage,
            "progress": progress,
            "video_url": video_url,
            "duration_seconds": duration_seconds,
        }
        if error_message:
            data["error_message"] = error_message
        if alert_email:
            data["alert_email"] = alert_email

        try:
            supabase.table("jobs").upsert(data).execute()
        except Exception as col_err:
            if "alert_email" in data and "alert_email" in str(col_err):
                # Column may not exist yet in Supabase schema — retry without it
                del data["alert_email"]
                supabase.table("jobs").upsert(data).execute()
            else:
                raise col_err
    except Exception as e:
        logger.error("❌ Failed to upsert job %s: %s", job_id, e)


def insert_tracks(job_id: str, tracks: list):
    """Persist track list to Postgres."""
    if not supabase or not tracks:
        return
    try:
        rows = [
            {
                "job_id": job_id,
                "track_id": t.track_id,
                "frame_start": t.frame_start,
                "frame_end": t.frame_end,
                "class_label": t.class_label,
                "bbox_sequence": [f.model_dump() for f in t.bbox_sequence],
            }
            for t in tracks
        ]
        supabase.table("tracks").insert(rows).execute()
        logger.info("✅ Inserted %d tracks for job %s", len(rows), job_id)
    except Exception as e:
        logger.error("❌ Failed to insert tracks: %s", e)


def insert_events(job_id: str, events: list):
    """Persist event list to Postgres."""
    if not supabase or not events:
        return
    try:
        rows = [
            {
                "id": e.id,
                "job_id": job_id,
                "track_id": e.track_id,
                "timestamp_start": e.timestamp_start,
                "timestamp_end": e.timestamp_end,
                "behaviour_id": e.behaviour_id,
                "behaviour_label": e.behaviour_label,
                "risk_level": e.risk_level,
                "risk_score": e.risk_score,
                "explanation": e.explanation,
                "confidence_tier": e.confidence_tier,
                "contributing_factors": e.contributing_factors.model_dump(),
                "expected_practice": e.expected_practice,
                "bbox": e.bbox.model_dump() if e.bbox else None,
            }
            for e in events
        ]
        supabase.table("events").insert(rows).execute()
        logger.info("✅ Inserted %d events for job %s", len(rows), job_id)
    except Exception as e:
        logger.error("❌ Failed to insert events: %s", e)
