from typing import Literal, Optional, List, Dict
from pydantic import BaseModel

class JobStatus(BaseModel):
    job_id: str
    status: Literal['pending', 'processing', 'done', 'error']
    stage: Literal['uploading', 'extracting_frames', 'detecting_objects', 'reasoning', 'scoring_risk', 'compiling_report', 'done']
    progress: int  # 0-100
    error: Optional[str] = None
    stage_timings: Optional[Dict[str, float]] = None
    alert_email: Optional[str] = None
    email_sent: Optional[bool] = None

class BBox(BaseModel):
    x: float
    y: float
    width: float
    height: float

class ContributingFactors(BaseModel):
    base_severity: float
    height_factor: float
    duration_factor: float
    repeat_factor: float

class Event(BaseModel):
    id: str
    job_id: str
    timestamp_start: float
    timestamp_end: float
    behaviour_label: str
    behaviour_id: int
    risk_level: Literal['low', 'medium', 'high', 'critical']
    risk_score: float  # 0-100
    explanation: str
    confidence_tier: Literal['observed_behaviour', 'potential_risk']
    contributing_factors: ContributingFactors
    expected_practice: str
    bbox: Optional[BBox] = None
    track_id: Optional[int] = None

class TrackFrame(BaseModel):
    frame: int
    timestamp: float
    x: float
    y: float
    width: float
    height: float

class Track(BaseModel):
    track_id: int
    frame_start: int
    frame_end: int
    class_label: str
    bbox_sequence: List[TrackFrame]

class Summary(BaseModel):
    total_events: int
    by_risk: Dict[str, int]  # low/medium/high/critical counts
    most_frequent_behaviour: str
    events_prevented_estimate: int
    video_duration_seconds: float

class JobResults(BaseModel):
    job_id: str
    video_url: str
    duration_seconds: float
    events: List[Event]
    tracks: List[Track]
    summary: Summary
    alert_email: Optional[str] = None
    email_sent: Optional[bool] = None
