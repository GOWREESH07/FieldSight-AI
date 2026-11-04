"""
FieldSight — async video processing pipeline.
5 stages with real progress updates + optional Supabase persistence.
"""
import uuid
import cv2
import time
import asyncio
import os
from typing import Dict, Any

from db.models import Event, JobResults, Summary, BBox
from db.supabase_client import (
    upsert_job, insert_tracks, insert_events, upload_video_to_storage
)
from pipeline.detector import detect_and_track
from pipeline.classifier import classify_events_cached, BEHAVIOUR_TAXONOMY
from pipeline.risk_engine import score_risk
from services.email_notifier import send_risk_alert_email


def _update(jobs_store: Dict[str, Any], job_id: str,
            stage: str, progress: int, status: str = "processing"):
    """Update in-memory store and Supabase simultaneously."""
    jobs_store[job_id]["stage"]    = stage
    jobs_store[job_id]["progress"] = progress
    jobs_store[job_id]["status"]   = status
    
    stage_timings = jobs_store[job_id].get("stage_timings", {})
    upsert_job(job_id, status=status, stage=stage, progress=progress, stage_timings=stage_timings)


async def process_video(job_id: str, video_path: str, jobs_store: Dict[str, Any]):
    jobs_store[job_id]["stage_timings"] = {}
    stage_start = time.time()
    
    def _log_timing(stage_name: str):
        nonlocal stage_start
        elapsed = time.time() - stage_start
        jobs_store[job_id]["stage_timings"][stage_name] = round(elapsed, 2)
        print(f"[worker] Stage '{stage_name}': {elapsed:.1f}s")
        stage_start = time.time()

    try:
        # ── Stage 1: extracting_frames (0 → 15%) ──────────────────────────
        _update(jobs_store, job_id, "extracting_frames", 0)

        cap = cv2.VideoCapture(video_path)
        fps           = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames  = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration_secs = total_frames / fps
        cap.release()

        _update(jobs_store, job_id, "extracting_frames", 15)
        # Persist job row to Supabase now we know the duration
        upsert_job(job_id, status="processing", stage="extracting_frames",
                   progress=15, duration_seconds=duration_secs,
                   stage_timings=jobs_store[job_id]["stage_timings"])
                   
        _log_timing("extracting_frames")

        # ── Stage 2: detecting_objects (15 → 50%) ─────────────────────────
        _update(jobs_store, job_id, "detecting_objects", 15)

        def tracking_progress_cb(pct: int):
            mapped = 15 + int((pct / 100) * 35)
            jobs_store[job_id]["progress"] = mapped

        tracks = detect_and_track(video_path, job_id, tracking_progress_cb)
        jobs_store[job_id]["tracks"] = tracks

        _update(jobs_store, job_id, "detecting_objects", 50)
        insert_tracks(job_id, tracks)   # persist to Supabase
        
        _log_timing("detecting_objects")

        # ── Stage 3: reasoning (50 → 80%) ─────────────────────────────────
        _update(jobs_store, job_id, "reasoning", 50)

        def reasoning_progress_cb(completed: int, total: int):
            pct = 50 + int((completed / total) * 30) if total > 0 else 80
            _update(jobs_store, job_id, "reasoning", pct)

        classifications = await classify_events_cached(tracks, video_path, progress_cb=reasoning_progress_cb)

        _update(jobs_store, job_id, "reasoning", 80)
        _log_timing("reasoning")

        # ── Stage 4: scoring_risk (80 → 95%) ──────────────────────────────
        _update(jobs_store, job_id, "scoring_risk", 80)

        events = []
        jobs_store[job_id]["events"] = []  # Initialize empty list to stream into
        
        total_cls = len(classifications)
        
        for i, cls in enumerate(classifications):
            score, factors = score_risk(cls, classifications)

            # Look up expected practice from taxonomy
            expected = next(
                (t["expected"] for t in BEHAVIOUR_TAXONOMY if t["id"] == cls.get("behaviour_id")),
                ""
            )

            # Build BBox from representative_bbox dict
            bbox_data = cls.get("representative_bbox") or cls.get("bbox")
            bbox = None
            if isinstance(bbox_data, dict):
                bbox = BBox(
                    x=bbox_data.get("x", 0),
                    y=bbox_data.get("y", 0),
                    width=bbox_data.get("width", 0),
                    height=bbox_data.get("height", 0),
                )
            elif hasattr(bbox_data, "x"):
                bbox = BBox(x=bbox_data.x, y=bbox_data.y,
                            width=bbox_data.width, height=bbox_data.height)

            event = Event(
                id=str(uuid.uuid4()),
                job_id=job_id,
                timestamp_start=float(cls.get("start_time", 0.0)),
                timestamp_end=float(cls.get("end_time", 0.0)),
                behaviour_label=str(cls.get("behaviour_label", "")),
                behaviour_id=int(cls.get("behaviour_id", 0)),
                risk_level=str(cls.get("risk_level", "low")),
                risk_score=score,
                explanation=str(cls.get("explanation", "")),
                confidence_tier=str(cls.get("confidence_tier", "observed_behaviour")),
                contributing_factors=factors,
                expected_practice=expected,
                bbox=bbox,
                track_id=cls.get("track_id"),
            )
            events.append(event)
            jobs_store[job_id]["events"].append(event)
            insert_events(job_id, [event])
            
            # update progress incrementally
            if total_cls > 0:
                pct = 80 + int(((i + 1) / total_cls) * 15)
                _update(jobs_store, job_id, "scoring_risk", pct)

        _update(jobs_store, job_id, "scoring_risk", 95)
        _log_timing("scoring_risk")

        # ── Stage 5: compiling_report (95 → 100%) ─────────────────────────
        _update(jobs_store, job_id, "compiling_report", 95)

        by_risk: Dict[str, int] = {"low": 0, "medium": 0, "high": 0, "critical": 0}
        behaviour_counts: Dict[str, int] = {}
        for e in events:
            if e.risk_level in by_risk:
                by_risk[e.risk_level] += 1
            behaviour_counts[e.behaviour_label] = (
                behaviour_counts.get(e.behaviour_label, 0) + 1
            )

        most_frequent = max(behaviour_counts, key=behaviour_counts.get) if behaviour_counts else "None detected"

        summary = Summary(
            total_events=len(events),
            by_risk=by_risk,
            most_frequent_behaviour=most_frequent,
            events_prevented_estimate=max(1, int(len(events) * 1.5)) if events else 0,
            video_duration_seconds=duration_secs,
        )

        # Upload video to Supabase Storage (best-effort)
        public_url = upload_video_to_storage(video_path, job_id)
        video_url  = public_url or f"/media/{job_id}/input.mp4"

        alert_email = jobs_store[job_id].get("alert_email")
        video_filename = jobs_store[job_id].get("filename", os.path.basename(video_path))

        results = JobResults(
            job_id=job_id,
            video_url=video_url,
            duration_seconds=duration_secs,
            events=events,
            tracks=tracks,
            summary=summary,
            alert_email=alert_email,
            email_sent=False,
        )

        jobs_store[job_id]["results"] = results

        # Final update — done ✅
        _update(jobs_store, job_id, "done", 100, status="done")
        
        _log_timing("compiling_report")

        print(f"[worker] ✅ Job {job_id} complete — {len(events)} events detected.")

        # Fire-and-forget background email notification
        if alert_email:
            async def _dispatch_email():
                try:
                    sent = await send_risk_alert_email(job_id, alert_email, video_filename, events, summary)
                    jobs_store[job_id]["email_sent"] = sent
                    if jobs_store[job_id].get("results"):
                        jobs_store[job_id]["results"].email_sent = sent
                except Exception as email_err:
                    print(f"[worker] Background email dispatch error: {email_err}")

            asyncio.create_task(_dispatch_email())

    except Exception as exc:
        import traceback
        traceback.print_exc()
        jobs_store[job_id]["status"] = "error"
        jobs_store[job_id]["error"]  = str(exc)
        upsert_job(job_id, status="error", stage=jobs_store[job_id].get("stage", ""),
                   progress=jobs_store[job_id].get("progress", 0),
                   error_message=str(exc))
        print(f"[worker] ❌ Job {job_id} failed: {exc}")
