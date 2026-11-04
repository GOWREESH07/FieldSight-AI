import { JobStatusResponse, JobResults } from './utils';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function uploadVideo(file: File, alertEmail?: string): Promise<{ job_id: string; alert_email?: string }> {
  const formData = new FormData();
  formData.append('video', file);
  if (alertEmail && alertEmail.trim()) {
    formData.append('alert_email', alertEmail.trim());
  }
  
  const res = await fetch(`${BACKEND}/api/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Upload failed');
  }
  return res.json();
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(`${BACKEND}/api/jobs/${jobId}/status`);
  if (!res.ok) throw new Error('Failed to get job status');
  return res.json();
}

export async function getJobResults(jobId: string): Promise<JobResults> {
  const res = await fetch(`${BACKEND}/api/jobs/${jobId}/results`);
  if (!res.ok) throw new Error('Failed to get job results');
  return res.json();
}

export async function sendChatMessage(jobId: string, message: string): Promise<{ response: string }> {
  const res = await fetch(`${BACKEND}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: jobId, message }),
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}
