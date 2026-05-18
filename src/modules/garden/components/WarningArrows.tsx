import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ActiveWarning } from '../hooks/useCompatibility';

interface Arrow {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const SEVERITY_COLOR: Record<ActiveWarning['severity'], string> = {
  high: '#ef4444',
  medium: '#f97316',
  low: '#eab308',
};

interface Props {
  hoveredWarning: ActiveWarning | null;
}

export const WarningArrows = ({ hoveredWarning }: Props) => {
  const [arrows, setArrows] = useState<Arrow[]>([]);

  useEffect(() => {
    if (!hoveredWarning) {
      setArrows([]);
      return;
    }

    const warningEl = document.querySelector<HTMLElement>(
      `[data-warning-id="${CSS.escape(hoveredWarning.id)}"]`,
    );
    if (!warningEl) return;

    const rW = warningEl.getBoundingClientRect();
    const startX = rW.left;
    const startY = (rW.top + rW.bottom) / 2;

    const next: Arrow[] = [];
    for (const plantId of hoveredWarning.affectedPlantIds) {
      const plantEl = document.querySelector<HTMLElement>(`[data-placed-id="${plantId}"]`);
      if (!plantEl) continue;
      const rP = plantEl.getBoundingClientRect();
      next.push({
        x1: startX,
        y1: startY,
        x2: (rP.left + rP.right) / 2,
        y2: (rP.top + rP.bottom) / 2,
      });
    }
    setArrows(next);
  }, [hoveredWarning]);

  if (!hoveredWarning || arrows.length === 0) return null;

  const color = SEVERITY_COLOR[hoveredWarning.severity];
  const markerId = `warning-arrow-${hoveredWarning.severity}`;

  return createPortal(
    <svg
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999,
        overflow: 'visible',
      }}
    >
      <defs>
        <marker
          id={markerId}
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <path d="M 0 0 L 8 4 L 0 8 Z" fill={color} />
        </marker>
      </defs>
      {arrows.map((a, i) => {
        const dist = Math.abs(a.x1 - a.x2);
        const curve = dist * 0.45;
        const d = `M ${a.x1} ${a.y1} C ${a.x1 - curve} ${a.y1} ${a.x2 + curve} ${a.y2} ${a.x2} ${a.y2}`;
        return (
          <path
            key={i}
            d={d}
            stroke={color}
            strokeWidth="2"
            fill="none"
            strokeDasharray="6 3"
            markerEnd={`url(#${markerId})`}
            opacity="0.85"
          />
        );
      })}
    </svg>,
    document.body,
  );
};
