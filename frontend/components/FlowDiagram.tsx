export function FlowDiagram() {
  return (
    <div className="w-full overflow-x-auto py-6">
      <svg width="980" height="200" viewBox="0 0 980 200" className="mx-auto font-sans select-none">
        {/* ROW 1: TRADITIONAL */}
        <g transform="translate(10, 20)">
          <text x="0" y="24" fill="#9B9B96" fontSize="10" fontFamily="IBM Plex Mono, monospace" letterSpacing="2" fontWeight="600">
            TRADITIONAL
          </text>
          
          {/* Node 1: Camera */}
          <rect x="110" y="4" width="105" height="38" rx="4" fill="#FFFFFF" stroke="#E5E5E2" strokeWidth="1" />
          <text x="162" y="27" textAnchor="middle" fill="#6B6B66" fontSize="12" fontWeight="500">Camera</text>

          {/* Arrow 1 */}
          <path d="M 215 23 L 245 23" stroke="#D1D1CC" strokeWidth="1.5" markerEnd="url(#arrow-muted)" />

          {/* Node 2: Recording */}
          <rect x="245" y="4" width="110" height="38" rx="4" fill="#FFFFFF" stroke="#E5E5E2" strokeWidth="1" />
          <text x="300" y="27" textAnchor="middle" fill="#6B6B66" fontSize="12" fontWeight="500">Recording</text>

          {/* Arrow 2 */}
          <path d="M 355 23 L 385 23" stroke="#D1D1CC" strokeWidth="1.5" markerEnd="url(#arrow-muted)" />

          {/* Node 3: Human Review */}
          <rect x="385" y="4" width="120" height="38" rx="4" fill="#FFFFFF" stroke="#E5E5E2" strokeWidth="1" />
          <text x="445" y="27" textAnchor="middle" fill="#6B6B66" fontSize="12" fontWeight="500">Human Review</text>

          {/* Arrow 3 (with Days Later label above) */}
          <g>
            <path d="M 505 23 L 585 23" stroke="#9B9B96" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#arrow-muted)" />
            <rect x="520" y="-8" width="56" height="18" rx="9" fill="#F3F4F6" stroke="#E5E5E2" strokeWidth="1" />
            <text x="548" y="4" textAnchor="middle" fill="#6B7280" fontSize="9" fontFamily="IBM Plex Mono, monospace" fontWeight="600">
              Days later
            </text>
          </g>

          {/* Node 4: Incident Discovered */}
          <rect x="585" y="4" width="145" height="38" rx="4" fill="#FFFFFF" stroke="#E5E5E2" strokeWidth="1" />
          <text x="657" y="27" textAnchor="middle" fill="#6B6B66" fontSize="12" fontWeight="500">Incident Discovered</text>

          {/* Arrow 4 */}
          <path d="M 730 23 L 760 23" stroke="#D1D1CC" strokeWidth="1.5" markerEnd="url(#arrow-muted)" />

          {/* Node 5: Corrective Action */}
          <rect x="760" y="4" width="140" height="38" rx="4" fill="#FFFFFF" stroke="#E5E5E2" strokeWidth="1" />
          <text x="830" y="27" textAnchor="middle" fill="#6B6B66" fontSize="12" fontWeight="500">Corrective Action</text>
        </g>

        {/* ROW 2: FIELDSIGHT */}
        <g transform="translate(10, 110)">
          <text x="0" y="24" fill="#2563EB" fontSize="10" fontFamily="IBM Plex Mono, monospace" letterSpacing="2" fontWeight="700">
            FIELDSIGHT
          </text>
          
          {/* Node 1: Camera */}
          <rect x="110" y="4" width="105" height="38" rx="4" fill="#FFFFFF" stroke="#2563EB" strokeWidth="1.5" />
          <text x="162" y="27" textAnchor="middle" fill="#1A1A18" fontSize="12" fontWeight="600">Camera</text>

          {/* Arrow 1 */}
          <path d="M 215 23 L 240 23" stroke="#2563EB" strokeWidth="1.5" markerEnd="url(#arrow-accent)" />

          {/* Node 2: AI Perception */}
          <rect x="240" y="4" width="125" height="38" rx="4" fill="#FFFFFF" stroke="#2563EB" strokeWidth="1.5" />
          <text x="302" y="27" textAnchor="middle" fill="#1A1A18" fontSize="12" fontWeight="600">AI Perception</text>

          {/* Arrow 2 */}
          <path d="M 365 23 L 390 23" stroke="#2563EB" strokeWidth="1.5" markerEnd="url(#arrow-accent)" />

          {/* Node 3: Behaviour Understanding */}
          <rect x="390" y="4" width="170" height="38" rx="4" fill="#FFFFFF" stroke="#2563EB" strokeWidth="1.5" />
          <text x="475" y="27" textAnchor="middle" fill="#1A1A18" fontSize="12" fontWeight="600">Behaviour Understanding</text>

          {/* Arrow 3 */}
          <path d="M 560 23 L 585 23" stroke="#2563EB" strokeWidth="1.5" markerEnd="url(#arrow-accent)" />

          {/* Node 4: Risk Detection (Critical highlight) */}
          <rect x="585" y="4" width="120" height="38" rx="4" fill="#FEF2F2" stroke="#DC2626" strokeWidth="1.5" />
          <text x="645" y="27" textAnchor="middle" fill="#DC2626" fontSize="12" fontWeight="700">Risk Detection</text>

          {/* Arrow 4 (with Real-time badge above) */}
          <g>
            <path d="M 705 23 L 775 23" stroke="#DC2626" strokeWidth="1.5" markerEnd="url(#arrow-risk)" />
            <rect x="715" y="-8" width="55" height="18" rx="9" fill="#FEF2F2" stroke="#FCA5A5" strokeWidth="1" />
            <text x="742" y="4" textAnchor="middle" fill="#DC2626" fontSize="9" fontFamily="IBM Plex Mono, monospace" fontWeight="700">
              Real-time
            </text>
          </g>

          {/* Node 5: Alert & Intervention */}
          <rect x="775" y="4" width="150" height="38" rx="4" fill="#FFFFFF" stroke="#2563EB" strokeWidth="1.5" />
          <text x="850" y="27" textAnchor="middle" fill="#1A1A18" fontSize="12" fontWeight="600">Alert &amp; Intervention</text>
        </g>

        {/* Definitions for arrow heads */}
        <defs>
          <marker id="arrow-muted" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#9B9B96" />
          </marker>
          <marker id="arrow-accent" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#2563EB" />
          </marker>
          <marker id="arrow-risk" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#DC2626" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}
