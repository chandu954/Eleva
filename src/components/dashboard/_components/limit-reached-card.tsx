'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LimitReachedCardProps {
  type: 'base' | 'tailored';
}

export function LimitReachedCard({ type }: LimitReachedCardProps) {
  return (
    <Link
      href="/subscription"
      className={cn(
        "group/limit block",
        "cursor-pointer",
        "transition-all duration-500",
        "hover:-translate-y-1",
      )}
    >
      <div className={cn(
        "aspect-[8.5/11] rounded-lg",
        "relative overflow-hidden",
        "border-2 border-dashed",
        "flex flex-col items-center justify-center gap-4",
        "border-amber-600/80",
        "bg-gradient-to-br from-amber-50/80 via-amber-50/40 to-amber-100/60",
        "transition-all duration-500",
        "hover:shadow-xl hover:shadow-amber-200/20",
        "hover:border-amber-600/90",
        "after:absolute after:inset-0 after:bg-gradient-to-br",
        "after:from-amber-600/[0.03] after:to-orange-600/[0.03]",
        "after:opacity-40 after:transition-opacity after:duration-500",
        "hover:after:opacity-60"
      )}>
        <div className={cn(
          "relative z-10 flex flex-col items-center",
          "transform transition-all duration-500",
          "group-hover/limit:scale-105"
        )}>
          <div className={cn(
            "h-12 w-12 rounded-xl",
            "flex items-center justify-center",
            "bg-gradient-to-br from-amber-100 to-amber-50",
            "text-amber-600",
            "shadow-md",
            "transition-all duration-500",
            "group-hover/limit:shadow-lg",
            "group-hover/limit:bg-gradient-to-br",
            "group-hover/limit:from-amber-200",
            "group-hover/limit:to-amber-100",
            "group-hover/limit:-translate-y-1"
          )}>
            <Sparkles className={cn(
              "h-5 w-5",
              "transition-all duration-500",
              "group-hover/limit:scale-110"
            )} />
          </div>
          <span className={cn(
            "mt-4 text-sm font-medium",
            "text-amber-600",
            "transition-all duration-500",
            "group-hover/limit:text-amber-700"
          )}>
            {type === 'base' ? 'Base' : 'Tailored'} Limit Reached
          </span>
          <span className={cn(
            "mt-2 text-xs",
            "text-amber-600/70",
            "underline underline-offset-4",
            "transition-all duration-300",
            "group-hover/limit:text-amber-700/90"
          )}>
            Upgrade to create more
          </span>
        </div>
      </div>
    </Link>
  );
}
