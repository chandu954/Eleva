'use client';

import { cn } from '@/lib/utils';

interface ElevaLogoProps {
  className?: string;
  showWordmark?: boolean;
  size?: number;
}

/**
 * Eleva logo — geometric "E" with hidden upward arrow in negative space
 * (FedEx-style aha). Uses currentColor for the E and background for cutout.
 */
export function ElevaLogo({ className, showWordmark = true, size = 32 }: ElevaLogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5 select-none', className)}>
      <div
        className="relative flex items-center justify-center rounded-[10px]"
        style={{
          width: size,
          height: size,
          background:
            'linear-gradient(135deg, rgb(var(--eleva-primary)) 0%, rgb(var(--eleva-secondary)) 100%)',
          boxShadow:
            '0 6px 20px -6px rgba(37,99,235,.55), inset 0 1px 0 rgba(255,255,255,.25)',
        }}
        aria-label="Eleva logo"
      >
        <svg
          viewBox="0 0 40 40"
          width={size * 0.62}
          height={size * 0.62}
          fill="none"
          aria-hidden
        >
          {/* Main E shape */}
          <path
            d="M8 6h24v6H14v6h14v6H14v6h18v6H8V6z"
            fill="#ffffff"
          />
          {/* Upward-pointing arrow in negative space (subtle) */}
          <path
            d="M25.5 22 L21 17.5 V26.5 Z"
            fill="rgb(var(--eleva-primary))"
            opacity="0.9"
          />
        </svg>
      </div>
      {showWordmark && (
        <span
          className="font-display text-[18px] font-semibold tracking-[-0.02em]"
          style={{ color: 'rgb(var(--eleva-fg))' }}
        >
          Eleva
        </span>
      )}
    </div>
  );
}
