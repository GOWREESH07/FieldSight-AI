export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type JobStage = 'uploading' | 'extracting_frames' | 'detecting_objects' | 'reasoning' | 'scoring_risk' | 'compiling_report' | 'done';
export type JobStatus = 'pending' | 'processing' | 'done' | 'error';

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  stage: JobStage;
  progress: number;
  error?: string;
  stage_timings?: Record<string, number>;
  alert_email?: string;
  email_sent?: boolean;
}

export interface BBox { x: number; y: number; width: number; height: number; }

export interface ContributingFactors {
  base_severity: number;
  height_factor: number;
  duration_factor: number;
  repeat_factor: number;
}

export interface Event {
  id: string;
  job_id: string;
  timestamp_start: number;
  timestamp_end: number;
  behaviour_label: string;
  behaviour_id: number;
  risk_level: RiskLevel;
  risk_score: number;
  explanation: string;
  confidence_tier: 'observed_behaviour' | 'potential_risk';
  contributing_factors: ContributingFactors;
  expected_practice: string;
  bbox?: BBox;
  track_id?: number;
}

export interface TrackFrame { frame: number; timestamp: number; x: number; y: number; width: number; height: number; }

export interface Track {
  track_id: number;
  frame_start: number;
  frame_end: number;
  class_label: string;
  bbox_sequence: TrackFrame[];
}

export interface Summary {
  total_events: number;
  by_risk: { low: number; medium: number; high: number; critical: number };
  most_frequent_behaviour: string;
  events_prevented_estimate: number;
  video_duration_seconds: number;
}

export interface JobResults {
  job_id: string;
  video_url: string;
  duration_seconds: number;
  events: Event[];
  tracks: Track[];
  summary: Summary;
  alert_email?: string;
  email_sent?: boolean;
}

export function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
}

export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'critical': return '#DC2626';
    case 'high': return '#EA580C';
    case 'medium': return '#D97706';
    case 'low': return '#6B7280';
    default: return '#6B7280';
  }
}

export function getRiskBgColor(level: RiskLevel): string {
  switch (level) {
    case 'critical': return 'bg-risk-critical';
    case 'high': return 'bg-risk-high';
    case 'medium': return 'bg-risk-medium';
    case 'low': return 'bg-risk-low';
    default: return 'bg-surface';
  }
}

export function getRiskTextColor(level: RiskLevel): string {
  switch (level) {
    case 'critical': return 'text-risk-critical';
    case 'high': return 'text-risk-high';
    case 'medium': return 'text-risk-medium';
    case 'low': return 'text-risk-low';
    default: return 'text-text-primary';
  }
}

export function getSeverityOrder(level: RiskLevel): number {
  switch (level) {
    case 'critical': return 4;
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
}
