import { cn } from '@/lib/utils';

interface OrbitDecorationProps {
  className?: string;
  /** Compact = fewer rings/nodes for tight areas */
  compact?: boolean;
}

export function OrbitDecoration({ className, compact = false }: OrbitDecorationProps) {
  return (
    <div className={cn('pointer-events-none absolute hidden md:block', className)} aria-hidden>
      <div className="eleva-orbit-drift absolute inset-0">
        <div
          className="eleva-orbit-ring"
          style={{ width: compact ? 320 : 420, height: compact ? 320 : 420, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
        />
        <div
          className="eleva-orbit-ring"
          style={{ width: compact ? 440 : 560, height: compact ? 440 : 560, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
        />
        <div
          className="eleva-orbit-node"
          style={{ width: 8, height: 8, left: '50%', top: '6%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#2563EB,#7C3AED)', boxShadow: '0 0 12px rgba(79,70,229,.55)' }}
        />
        <div
          className="eleva-orbit-node"
          style={{ width: 5, height: 5, left: '16%', top: '58%', background: '#93C5FD', boxShadow: '0 0 10px rgba(147,197,253,.7)' }}
        />
        <div
          className="eleva-orbit-node"
          style={{ width: 5, height: 5, right: '13%', top: '38%', background: '#C4B5FD', boxShadow: '0 0 10px rgba(196,181,253,.7)' }}
        />
      </div>
    </div>
  );
}

interface AmbientGlowProps {
  className?: string;
  /** Size of the blurred radial */
  size?: number;
  color?: 'blue' | 'indigo';
}

export function AmbientGlow({ className, size = 480, color = 'blue' }: AmbientGlowProps) {
  return (
    <div
      aria-hidden
      className={cn('eleva-glow', className)}
      style={{
        width: size,
        height: size,
        background:
          color === 'blue' ? 'rgba(37,99,235,0.12)' : 'rgba(99,102,241,0.12)',
      }}
    />
  );
}
