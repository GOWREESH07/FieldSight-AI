"use client";
import { useEffect, useState } from 'react';
import { getJobStatus } from '../lib/api';
import { JobStage, JobStatusResponse } from '../lib/utils';
import { CheckCircle2, CircleDashed, Loader2 } from 'lucide-react';

const stages: { id: JobStage; label: string; desc: string }[] = [
  { id: 'extracting_frames', label: 'Extracting frames', desc: 'Decoding video and extracting keyframes' },
  { id: 'detecting_objects', label: 'Detecting objects & tracking', desc: 'YOLOv8 + ByteTrack pipeline' },
  { id: 'reasoning', label: 'Reasoning over action sequences', desc: 'Gemini 2.0 multi-modal analysis' },
  { id: 'scoring_risk', label: 'Scoring risk', desc: 'Applying situational factors and baseline severities' },
  { id: 'compiling_report', label: 'Compiling report', desc: 'Generating final insights and timestamps' },
];

export function StatusPanel({ jobId, onComplete }: { jobId: string; onComplete: (jobId: string) => void }) {
  const [status, setStatus] = useState<JobStatusResponse | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await getJobStatus(jobId);
        setStatus(data);
        if (data.status === 'done' || data.status === 'error') {
          clearInterval(interval);
          if (data.status === 'done') onComplete(jobId);
        }
      } catch (err) {
        console.error(err);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [jobId, onComplete]);

  if (!status) return <div className="text-text-secondary animate-pulse text-sm font-mono">Connecting to job {jobId}...</div>;

  if (status.status === 'error') {
    return (
      <div className="bg-risk-critical/10 border border-risk-critical/30 rounded p-4 text-risk-critical font-mono text-sm">
        Error processing video: {status.error || 'Unknown error'}
      </div>
    );
  }

  const currentStageIndex = status.status === 'done' ? stages.length : stages.findIndex(s => s.id === status.stage);

  return (
    <div className="bg-surface border border-border rounded p-6 w-full max-w-md mx-auto">
      <h3 className="text-text-primary font-medium mb-4">Processing Footage</h3>
      
      <div className="space-y-4 mb-6">
        {stages.map((stage, i) => {
          const isCompleted = i < currentStageIndex;
          const isCurrent = i === currentStageIndex;
          const isPending = i > currentStageIndex;
          
          return (
            <div key={stage.id} className={`flex items-start gap-3 ${isPending ? 'opacity-40' : ''}`}>
              <div className="mt-0.5">
                {isCompleted && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                {isCurrent && <Loader2 className="w-5 h-5 text-text-primary animate-spin" />}
                {isPending && <CircleDashed className="w-5 h-5 text-text-muted" />}
              </div>
              <div>
                <div className={`text-sm font-medium ${isCurrent ? 'text-text-primary' : 'text-text-secondary'}`}>
                  {stage.label}
                </div>
                <div className="text-xs text-text-muted">{stage.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
        <div 
          className="bg-accent h-full transition-all duration-500 ease-out"
          style={{ width: `${status.progress}%` }}
        />
      </div>
      <div className="mt-2 text-right text-xs text-text-muted font-mono">{Math.round(status.progress)}%</div>
    </div>
  );
}
