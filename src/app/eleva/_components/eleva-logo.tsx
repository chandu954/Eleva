import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ElevaLogoProps {
  className?: string;
  showWordmark?: boolean;
  size?: number;
  asLink?: boolean;
  href?: string;
  variant?: 'brand' | 'white';
}

function ElevaMark({ size = 28, variant = 'brand' }: { size?: number; variant?: 'brand' | 'white' }) {
  const gradientId = `eleva-mark-grad-${size}`;
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      aria-hidden
    >
      {variant === 'brand' && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#2563EB" />
            <stop offset="0.55" stopColor="#4F46E5" />
            <stop offset="1" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
      )}
      <g fill={variant === 'brand' ? `url(#${gradientId})` : '#fff'}>
        <rect x="2" y="4" width="27" height="7" rx="3.5" />
        <rect x="6" y="12.5" width="23" height="7" rx="3.5" />
        <rect x="10" y="21" width="19" height="7" rx="3.5" />
      </g>
    </svg>
  );
}

export function ElevaLogo({
  className,
  showWordmark = true,
  size = 28,
  asLink = true,
  href = '/eleva/dashboard',
  variant = 'brand',
}: ElevaLogoProps) {
  const logoContent = (
    <div className={cn('flex items-center gap-2.5 select-none', className)}>
      <ElevaMark size={size} variant={variant} />
      {showWordmark && (
        <span
          className="font-display font-bold tracking-tight shrink-0 whitespace-nowrap"
          style={{
            fontSize: size * 0.6,
            letterSpacing: '-0.03em',
            color: variant === 'white' ? '#fff' : 'rgb(var(--eleva-fg))',
          }}
        >
          Eleva
        </span>
      )}
    </div>
  );

  if (asLink) {
    return <Link href={href}>{logoContent}</Link>;
  }

  return logoContent;
}
