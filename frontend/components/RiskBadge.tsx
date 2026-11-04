import { RiskLevel, getRiskBgColor, getRiskTextColor } from '../lib/utils';

export function RiskBadge({ level }: { level: RiskLevel }) {
  const bgColor = getRiskBgColor(level);
  const textColor = 'text-white';
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm uppercase text-xs font-mono tracking-wider ${bgColor} ${textColor}`}>
      {level}
    </span>
  );
}
