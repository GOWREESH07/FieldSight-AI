import { RiskBadge } from './RiskBadge';
import { RiskLevel } from '../lib/utils';

const behaviours: { label: string; desc: string; risk: RiskLevel }[] = [
  { label: 'Dropping / throwing product', desc: 'Worker drops or throws items from height, risking structural damage on impact.', risk: 'critical' },
  { label: 'Walking on product', desc: 'Worker steps or walks directly on top of items, applying uneven point pressure.', risk: 'critical' },
  { label: 'Dragging product', desc: 'Worker drags items across the floor, risking tearing and base damage.', risk: 'high' },
  { label: 'Improper lifting', desc: 'Lifting items from edges instead of base, risking product tear or injury.', risk: 'high' },
  { label: 'Overstacking beyond limit', desc: 'Stacking boxes beyond rated height, risking crush damage to bottom units.', risk: 'high' },
  { label: 'Rough placement', desc: 'Putting items down forcefully instead of lowering gently.', risk: 'medium' },
  { label: 'Edge balancing', desc: 'Balancing items on edges or sharp corners.', risk: 'medium' },
  { label: 'Squeezing / Crushing', desc: 'Applying lateral pressure that compresses the product packaging.', risk: 'medium' },
  { label: 'Unstable palletizing', desc: 'Creating leaning or structurally unsound stacks.', risk: 'medium' },
  { label: 'Pushing with foot', desc: 'Using feet to nudge or position items on the floor.', risk: 'low' },
  { label: 'Resting objects on product', desc: 'Using product as a temporary table or shelf for tools/clipboards.', risk: 'low' },
  { label: 'Standard handling', desc: 'Safe, expected manual handling practices.', risk: 'low' },
];

export function BehaviourGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {behaviours.map((b, i) => (
        <div key={i} className="bg-surface border border-border rounded p-4 flex flex-col items-start gap-3">
          <RiskBadge level={b.risk} />
          <div>
            <h3 className="text-text-primary font-medium mb-1 leading-snug">{b.label}</h3>
            <p className="text-text-secondary text-sm leading-relaxed">{b.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
