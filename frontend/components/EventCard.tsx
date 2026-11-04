import { Event, formatTimestamp } from '../lib/utils';
import { RiskBadge } from './RiskBadge';

export function EventCard({ 
  event, 
  onSelect,
  onAskAi
}: { 
  event: Event; 
  onSelect: (time: number) => void;
  onAskAi?: (event: Event) => void;
}) {
  const isCritical = event.risk_level === 'critical';
  
  return (
    <div 
      onClick={() => onSelect(event.timestamp_start)}
      style={isCritical ? { borderLeftColor: '#DC2626', borderLeftWidth: '3px' } : {}}
      className={`bg-surface border border-border rounded p-4 mb-3 cursor-pointer transition-colors hover:bg-gray-50 relative overflow-hidden group`}
    >
      {!isCritical && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
      
      <div className="flex items-center justify-between mb-3">
        <RiskBadge level={event.risk_level} />
        <div className="text-text-muted font-mono text-xs">
          {formatTimestamp(event.timestamp_start)} – {formatTimestamp(event.timestamp_end)}
        </div>
        {event.track_id !== undefined && (
          <div className="text-text-secondary font-mono text-xs">Track #{event.track_id}</div>
        )}
      </div>

      <h4 className="text-text-primary font-medium mb-2">{event.behaviour_label}</h4>
      
      <div className="bg-gray-50 rounded p-3 mb-3 text-sm text-text-secondary border border-border">
        <span className="text-text-primary text-xs font-mono uppercase tracking-widest block mb-1">AI Explanation</span>
        {event.explanation}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
        <div>
          <span className="text-text-muted block text-xs mb-1">Confidence</span>
          <span className="text-text-primary font-mono text-xs uppercase bg-border px-1.5 py-0.5 rounded-sm inline-block">
            {event.confidence_tier === 'observed_behaviour' ? 'OBSERVED BEHAVIOUR' : 'POTENTIAL RISK'}
          </span>
        </div>
        <div>
          <span className="text-text-muted block text-xs mb-1">Expected Practice</span>
          <span className="text-text-secondary line-clamp-2" title={event.expected_practice}>{event.expected_practice}</span>
        </div>
      </div>

      <div className="border-t border-border pt-3 mt-3">
        <div className="text-xs text-text-muted uppercase tracking-widest mb-2 font-mono">Risk Breakdown</div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs font-mono">
          <div className="flex justify-between text-text-secondary">
            <span>Base severity</span><span>{event.contributing_factors.base_severity} / 100</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Height factor</span><span>×{event.contributing_factors.height_factor.toFixed(1)}</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Duration factor</span><span>×{event.contributing_factors.duration_factor.toFixed(1)}</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Repeat factor</span><span>×{event.contributing_factors.repeat_factor.toFixed(1)}</span>
          </div>
          <div className="col-span-2 border-t border-gray-200 my-1"></div>
          <div className="flex justify-between text-text-primary font-medium">
            <span>Risk score</span><span>{event.risk_score.toFixed(1)}</span>
          </div>
        </div>
        {onAskAi && (
          <div className="mt-3 pt-2 border-t border-border flex justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAskAi(event);
              }}
              className="text-xs font-mono text-accent hover:text-blue-700 flex items-center gap-1.5 py-1 px-2.5 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
            >
              Ask AI about this incident →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
