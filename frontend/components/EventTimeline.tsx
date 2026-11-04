"use client";
import { Event, getRiskColor, formatTimestamp } from '../lib/utils';
import { useState } from 'react';

export function EventTimeline({ 
  events, 
  duration, 
  onSeek, 
  currentTime 
}: { 
  events: Event[]; 
  duration: number; 
  onSeek: (time: number) => void;
  currentTime: number;
}) {
  const [hoveredEvent, setHoveredEvent] = useState<Event | null>(null);

  const getPosition = (time: number) => {
    return Math.max(0, Math.min(100, (time / duration) * 100));
  };

  return (
    <div className="w-full bg-surface border-y border-border h-12 relative flex items-center group shadow-sm">
      {/* Time indicator */}
      <div 
        className="absolute top-0 bottom-0 w-px bg-gray-800 z-20 pointer-events-none"
        style={{ left: `${getPosition(currentTime)}%` }}
      />
      
      {/* Events */}
      {events.map((event) => {
        const left = getPosition(event.timestamp_start);
        const color = getRiskColor(event.risk_level);
        
        return (
          <div 
            key={event.id}
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full cursor-pointer hover:scale-150 transition-transform z-10"
            style={{ 
              left: `${left}%`, 
              backgroundColor: color,
            }}
            onClick={() => onSeek(event.timestamp_start)}
            onMouseEnter={() => setHoveredEvent(event)}
            onMouseLeave={() => setHoveredEvent(null)}
          />
        );
      })}

      {/* Tooltip */}
      {hoveredEvent && (
        <div 
          className="absolute -top-10 bg-white border border-border px-3 py-1.5 rounded shadow-lg text-xs whitespace-nowrap z-30 pointer-events-none transition-all flex flex-col gap-1"
          style={{ 
            left: `calc(${getPosition(hoveredEvent.timestamp_start)}%)`,
            transform: 'translateX(-50%)'
          }}
        >
          <span className="text-text-primary font-medium">{hoveredEvent.behaviour_label}</span>
          <span className="text-text-muted font-mono">{formatTimestamp(hoveredEvent.timestamp_start)}</span>
        </div>
      )}
    </div>
  );
}
