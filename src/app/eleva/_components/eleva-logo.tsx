import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ElevaLogoProps {
  className?: string;
  showWordmark?: boolean;
  size?: number;
  asLink?: boolean;
}

function ElevaMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      aria-hidden
    >
      <g fill="currentColor">
        <rect x="5" y="5" width="4" height="22" rx="1" />
        <rect x="9" y="21" width="10" height="4" rx="1" />
        <rect x="9" y="14" width="16" height="4" rx="1" />
        <rect x="9" y="7" width="22" height="4" rx="1" />
      </g>
    </svg>
  );
}

export function ElevaLogo({ className, showWordmark = true, size = 28, asLink = true }: ElevaLogoProps) {
  const logoContent = (
    <div className={cn('flex items-center gap-2.5 select-none', className)}>
      <div
        className="flex items-center justify-center rounded-[10px]"
        style={{
          width: size * 1.15,
          height: size * 1.15,
          backgroundColor: '#111827',
        }}
        aria-label="Eleva logo"
      >
        <ElevaMark size={size * 0.62} />
      </div>
      {showWordmark && (
        <span
          className="font-semibold tracking-tight shrink-0 whitespace-nowrap"
          style={{ fontSize: size * 0.625, color: '#0F172A' }}
        >
          Eleva
        </span>
      )}
    </div>
  );

  if (asLink) {
    return <Link href="/eleva/dashboard">{logoContent}</Link>;
  }

  return logoContent;
}
