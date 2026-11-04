"""
YOLOv8n + ByteTrack — fast multi-object tracking.
Samples every 3rd frame for speed; filters out tiny/short-lived tracks.
"""
import cv2
from typing import List
from ultralytics import YOLO
from db.models import Track, TrackFrame
from config import settings

# Load model once at import time (auto-downloads yolov8n.pt ~6MB on first run)
_yolo = YOLO('yolov8n.pt')

# Only track these COCO classes — enough for warehouse scenes
TRACK_SAMPLE_EVERY_N_FRAMES = 3   # process 1 in 3 frames → ~10fps equivalent at 30fps
MIN_TRACK_FRAMES = 10             # discard tracks seen in fewer than 10 sampled frames


def detect_and_track(video_path: str, job_id: str, update_progress_cb) -> List[Track]:
    """
    Run YOLOv8n + ByteTrack on the video.
    Returns Track list — one entry per unique persistent track_id.
    """
    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    cap.release()

    tracks_dict: dict = {}

    stride = 5 if settings.DEMO_MODE else TRACK_SAMPLE_EVERY_N_FRAMES

    results_gen = _yolo.track(
        source=video_path,
        stream=True,
        tracker='bytetrack.yaml',
        persist=True,
        verbose=False,
        vid_stride=stride,
        imgsz=640,
    )

    for frame_idx, result in enumerate(results_gen):
        # frame_idx here is the sampled frame index (already strided)
        real_frame  = frame_idx * stride
        timestamp   = real_frame / fps

        if result.boxes is not None and result.boxes.id is not None:
            boxes     = result.boxes.xywh.cpu().numpy()
            track_ids = result.boxes.id.int().cpu().numpy()
            cls_ids   = result.boxes.cls.int().cpu().numpy()

            for box, tid, cid in zip(boxes, track_ids, cls_ids):
                x, y, w, h = float(box[0]), float(box[1]), float(box[2]), float(box[3])
                label = _yolo.names.get(int(cid), str(cid))

                tf = TrackFrame(frame=real_frame, timestamp=timestamp,
                                x=x, y=y, width=w, height=h)

                tid = int(tid)
                if tid not in tracks_dict:
                    tracks_dict[tid] = {
                        "track_id":     tid,
                        "frame_start":  real_frame,
                        "frame_end":    real_frame,
                        "class_label":  label,
                        "bbox_sequence": [],
                    }
                tracks_dict[tid]["bbox_sequence"].append(tf)
                tracks_dict[tid]["frame_end"] = real_frame

        # Report progress every 20 sampled frames
        if frame_idx % 20 == 0 and total_frames > 0:
            pct = int((real_frame / total_frames) * 100)
            update_progress_cb(min(pct, 99))

    update_progress_cb(100)

    # Filter out very short-lived tracks (noise / false positives)
    all_tracks = [
        Track(**td)
        for td in tracks_dict.values()
        if len(td["bbox_sequence"]) >= MIN_TRACK_FRAMES
    ]

    print(f"[detector] Tracked {len(tracks_dict)} raw tracks → "
          f"{len(all_tracks)} kept after min-frame filter ({MIN_TRACK_FRAMES} frames)")
    return all_tracks
