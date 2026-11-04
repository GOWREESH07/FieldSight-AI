"use client";
import { useEffect, useRef } from 'react';
import { Track, Event, getRiskColor } from '../lib/utils';

export function VideoPlayer({ 
  jobId, 
  tracks, 
  events,
  onTimeUpdate,
  videoRef
}: { 
  jobId: string;
  tracks: Track[];
  events: Event[];
  onTimeUpdate: (time: number) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>();

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const handleLoadedMetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    if (video.readyState >= 1) handleLoadedMetadata();

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const t = video.currentTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (canvas.width === 0 || canvas.height === 0) {
        animFrameRef.current = requestAnimationFrame(draw);
        return;
      }
      
      const scaleX = canvas.width / video.videoWidth;
      const scaleY = canvas.height / video.videoHeight;
      
      tracks.forEach(track => {
        const frame = track.bbox_sequence.find(f => Math.abs(f.timestamp - t) < 0.2);
        if (!frame) return;
        
        const event = events.find(e => e.track_id === track.track_id && 
          t >= e.timestamp_start - 0.5 && t <= e.timestamp_end + 0.5);
        
        const color = event ? getRiskColor(event.risk_level) : '#374151';
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        
        const x = frame.x * scaleX;
        const y = frame.y * scaleY;
        const w = frame.width * scaleX;
        const h = frame.height * scaleY;
        
        ctx.strokeRect(x, y, w, h);
        
        // Label background
        ctx.fillStyle = color;
        const label = event ? `#${track.track_id} ${event.confidence_tier === 'observed_behaviour' ? 'OBS' : 'RISK'}` : `#${track.track_id}`;
        
        ctx.font = '12px "IBM Plex Mono"';
        const textWidth = ctx.measureText(label).width;
        ctx.fillRect(x, y - 20, textWidth + 8, 20);
        
        // Label text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, x + 4, y - 6);
      });
      
      animFrameRef.current = requestAnimationFrame(draw);
    };
    
    animFrameRef.current = requestAnimationFrame(draw);
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [tracks, events, videoRef]);

  return (
    <div className="relative w-full aspect-video bg-black rounded overflow-hidden border border-border">
      <video
        ref={videoRef}
        src={`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/media/${jobId}/input.mp4`}
        className="w-full h-full object-contain absolute inset-0"
        controls
        onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
      />
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain absolute inset-0 pointer-events-none"
      />
    </div>
  );
}
