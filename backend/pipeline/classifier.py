"""
FieldSight — Gemini-based video classification.
Analyzes windows of footage to detect unsafe handling behaviors.
"""
import base64
import json
import typing
import asyncio
import os
import hashlib
import pickle
import cv2
from google import genai
from google.genai import types
from config import settings
from db.models import Track

BEHAVIOUR_TAXONOMY = [
    {"id": 1,  "label": "Throwing / dropping product",                      "severity": "critical", "expected": "Place items down gently; never throw or drop, regardless of height."},
    {"id": 2,  "label": "Dragging product instead of carrying/using equipment", "severity": "high",     "expected": "Use trolley, pallet truck, or carry correctly to prevent surface damage."},
    {"id": 3,  "label": "Rough handling / excessive impact",                    "severity": "high",     "expected": "Handle with care; use padding for fragile items; avoid sudden movements."},
    {"id": 4,  "label": "Improper stacking (heavy-on-light or unsupported)",    "severity": "high",     "expected": "Stack heavy items at bottom; ensure stable base; follow weight limits."},
    {"id": 5,  "label": "Unstable / overloaded stacking",                       "severity": "medium",   "expected": "Keep stacks within height and weight limits; ensure pyramid stability."},
    {"id": 6,  "label": "Product placed outside designated area",               "severity": "medium",   "expected": "Place all products within marked zones; follow floor layout."},
    {"id": 7,  "label": "Product handled without required equipment",           "severity": "medium",   "expected": "Use appropriate handling equipment (trolley/pallet truck) for heavy/bulky items."},
    {"id": 8,  "label": "Incorrect pallet positioning / product overhang",      "severity": "medium",   "expected": "Ensure products sit within pallet edges; no overhang beyond 50mm."},
    {"id": 9,  "label": "Rolling a product not designed to be rolled",          "severity": "medium",   "expected": "Use wheeled equipment; never roll cartons or rigid containers."},
    {"id": 10, "label": "Standing / stepping on cartons",                       "severity": "high",     "expected": "Never stand on product; use a step ladder or elevated platform."},
    {"id": 11, "label": "Unsafe loading/unloading sequence",                    "severity": "low",      "expected": "Follow FIFO sequence; stage items systematically before loading."},
    {"id": 12, "label": "Wet-floor / unsafe-surface handling",                  "severity": "medium",   "expected": "Address wet surfaces before handling; use non-slip footwear and mats."},
]

_client = genai.Client(api_key=settings.GEMINI_API_KEY)
GEMINI_MODEL = "gemini-2.5-flash"

TAXONOMY_STR = "\n".join(
    f"  {t['id']}. [{t['severity'].upper()}] {t['label']}" for t in BEHAVIOUR_TAXONOMY
)

CACHE_DIR = "/tmp/loadsent_cache"
os.makedirs(CACHE_DIR, exist_ok=True)

if settings.DEMO_MODE:
    WINDOW_SEC = 8.0
    STEP_SEC = 8.0      # no overlap — fewer calls
    FRAMES_PER_WINDOW = 3
    MAX_CONCURRENT_GEMINI = 8  # push harder in demo
else:
    WINDOW_SEC = 6.0
    STEP_SEC = 4.0
    FRAMES_PER_WINDOW = 4
    MAX_CONCURRENT_GEMINI = 5


def _video_hash(video_path: str) -> str:
    h = hashlib.md5()
    with open(video_path, 'rb') as f:
        h.update(f.read(min(1024*1024, os.path.getsize(video_path))))  # hash first 1MB
    return h.hexdigest()

def _cache_path(video_path: str) -> str:
    return os.path.join(CACHE_DIR, f"{_video_hash(video_path)}.pkl")


def _encode_frame(frame_bgr, max_width=480) -> dict:
    """Resize + encode frame as base64 JPEG."""
    h, w = frame_bgr.shape[:2]
    if w > max_width:
        frame_bgr = cv2.resize(frame_bgr, (max_width, int(h * max_width / w)))
    _, buf = cv2.imencode('.jpg', frame_bgr, [cv2.IMWRITE_JPEG_QUALITY, 70])
    return {"mime_type": "image/jpeg", "data": base64.b64encode(buf).decode()}


def _call_gemini(frames: list, window_start: float, window_end: float) -> typing.Optional[dict]:
    """
    Send frames to Gemini and get back ONE JSON classification.
    Returns None if no unsafe behaviour detected.
    """
    prompt = f"""You are a warehouse safety AI. These {len(frames)} frames span {window_start:.1f}s to {window_end:.1f}s of CCTV footage.

BEHAVIOUR TAXONOMY (use ONLY these IDs):
{TAXONOMY_STR}

Look for: throwing/dropping boxes, dragging products, unsafe stacking, stepping on cartons, rolling items, wet floor hazards, rough handling.

If you see unsafe behaviour, return ONE JSON object for the MOST SEVERE behaviour visible.
If the scene shows safe/normal activity, return: {{"behaviour_id": null}}

Return ONLY valid JSON, no markdown:
{{
  "behaviour_id": <int 1-12 or null>,
  "behaviour_label": "<exact label>",
  "risk_level": "<low|medium|high|critical>",
  "explanation": "<one sentence: what you see and why it's risky>",
  "confidence_tier": "<observed_behaviour|potential_risk>",
  "estimated_drop_height_m": <float or null>,
  "handling_duration_seconds": <float>
}}"""

    # Build parts using new google.genai SDK
    content_parts = [types.Part.from_text(text=prompt)]
    for f in frames:
        content_parts.append(types.Part.from_bytes(
            data=base64.b64decode(f["data"]),
            mime_type=f["mime_type"],
        ))

    try:
        resp = _client.models.generate_content(
            model=GEMINI_MODEL,
            contents=content_parts,
            config=types.GenerateContentConfig(
                automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
            ),
        )
        raw = resp.text.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        data = json.loads(raw)
        return data if data.get("behaviour_id") is not None else None
    except Exception as e:
        print(f"[classifier] Gemini error ({window_start:.1f}s): {e}")
        return None

async def _call_gemini_async(semaphore, frames, window_start, window_end, progress_cb=None):
    async with semaphore:
        loop = asyncio.get_event_loop()
        res = await loop.run_in_executor(None, _call_gemini, frames, window_start, window_end)
        if progress_cb:
            progress_cb()
        return res, window_start, window_end


def _has_significant_motion(cap, fps, window_start, window_end, threshold=1500):
    """
    Sample 2 frames 1s apart in the window.
    Compute frame difference. If mean pixel diff < threshold, skip — static scene.
    Returns True if motion detected.
    """
    frames_to_check = [window_start + 0.5, window_start + 1.5]
    prev_gray = None
    for ts in frames_to_check:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(ts * fps))
        ret, frame = cap.read()
        if not ret:
            continue
        gray = cv2.cvtColor(cv2.resize(frame, (320, 180)), cv2.COLOR_BGR2GRAY)
        if prev_gray is not None:
            diff = cv2.absdiff(gray, prev_gray)
            if diff.mean() * 320 * 180 > threshold:
                return True
        prev_gray = gray
    return False


async def classify_events_async(tracks: typing.List[Track], video_path: str, progress_cb=None) -> typing.List[dict]:
    cap = cv2.VideoCapture(video_path)
    fps          = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration     = total_frames / fps

    windows_to_process = []
    window_start = 0.0
    
    print(f"[classifier] Video duration: {duration:.1f}s. Preparing windows...")
    
    while window_start < duration:
        window_end = min(window_start + WINDOW_SEC, duration)
        
        # Motion check
        if _has_significant_motion(cap, fps, window_start, window_end):
            # Extract frames
            timestamps = [
                window_start + (window_end - window_start) * i / (FRAMES_PER_WINDOW - 1)
                for i in range(FRAMES_PER_WINDOW)
            ]
            frames = []
            for ts in timestamps:
                frame_idx = int(ts * fps)
                cap.set(cv2.CAP_PROP_POS_FRAMES, min(frame_idx, total_frames - 1))
                ret, frame = cap.read()
                if ret:
                    frames.append(_encode_frame(frame))
                    
            if len(frames) >= 2:
                windows_to_process.append((frames, window_start, window_end))
        else:
            print(f"[classifier] Skipping window {window_start:.1f}-{window_end:.1f}s (no motion)")
            
        window_start += STEP_SEC

    cap.release()
    
    num_tasks = len(windows_to_process)
    if num_tasks == 0:
        return []

    print(f"[classifier] Firing {num_tasks} Gemini calls concurrently...")
    
    completed = 0
    def _task_done_cb():
        nonlocal completed
        completed += 1
        if progress_cb:
            progress_cb(completed, num_tasks)
            
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_GEMINI)
    tasks = [_call_gemini_async(semaphore, frames, ws, we, _task_done_cb) for frames, ws, we in windows_to_process]
    
    gemini_results = await asyncio.gather(*tasks)
    
    results = []
    seen_behaviours: dict = {}
    
    for (result, ws, we) in gemini_results:
        if result:
            bid = int(result["behaviour_id"])
            if 1 <= bid <= 12:
                tax = next((t for t in BEHAVIOUR_TAXONOMY if t["id"] == bid), None)
                if tax:
                    result["behaviour_label"] = tax["label"]

                result["behaviour_id"]  = bid
                result["start_time"]    = ws
                result["end_time"]      = we
                result["track_id"]      = None

                best_track = _best_track_in_window(tracks, ws, we)
                if best_track:
                    mid = len(best_track.bbox_sequence) // 2
                    bf  = best_track.bbox_sequence[mid]
                    result["representative_bbox"] = {
                        "x": bf.x, "y": bf.y,
                        "width": bf.width, "height": bf.height
                    }
                    result["track_id"] = best_track.track_id
                else:
                    result["representative_bbox"] = None

                seen_behaviours[bid] = seen_behaviours.get(bid, 0) + 1
                results.append(result)

    return results

async def classify_events_cached(tracks: typing.List[Track], video_path: str, progress_cb=None) -> typing.List[dict]:
    """Async entry point with caching — await this from the async worker instead of classify_events()."""
    cache_file = _cache_path(video_path)
    if os.path.exists(cache_file):
        print(f"[classifier] Cache hit — skipping Gemini calls")
        with open(cache_file, 'rb') as f:
            return pickle.load(f)

    results = await classify_events_async(tracks, video_path, progress_cb)

    with open(cache_file, 'wb') as f:
        pickle.dump(results, f)
    return results


def classify_events(tracks: typing.List[Track], video_path: str, progress_cb=None) -> typing.List[dict]:
    """Sync wrapper — only use when NOT inside a running event loop (e.g. scripts/tests)."""
    cache_file = _cache_path(video_path)
    if os.path.exists(cache_file):
        print(f"[classifier] Cache hit — skipping Gemini calls")
        with open(cache_file, 'rb') as f:
            return pickle.load(f)

    import nest_asyncio
    try:
        import nest_asyncio as _na
        _na.apply()
    except ImportError:
        pass

    results = asyncio.run(classify_events_async(tracks, video_path, progress_cb))

    with open(cache_file, 'wb') as f:
        pickle.dump(results, f)
    return results

def _best_track_in_window(tracks: typing.List[Track], t_start: float, t_end: float):
    best, best_count = None, 0
    for track in tracks:
        count = sum(
            1 for f in track.bbox_sequence
            if t_start <= f.timestamp <= t_end
        )
        if count > best_count:
            best, best_count = track, count
    return best if best_count > 0 else None
