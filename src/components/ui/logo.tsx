import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  asLink?: boolean;
  showWordmark?: boolean;
  size?: number;
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

export function Logo({ className, asLink = true, showWordmark = true, size = 28 }: LogoProps) {
  const logoContent = (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      <ElevaMark size={size} />
      {showWordmark && (
        <span className="font-semibold tracking-tight shrink-0 whitespace-nowrap" style={{ fontSize: size * 0.625 }}>
          Eleva
        </span>
      )}
    </div>
  );

  if (asLink) {
    return <Link href="/home">{logoContent}</Link>;
  }

  return logoContent;
}
