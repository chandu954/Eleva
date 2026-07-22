'use client';

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function EditorPanelHeader() {
  return (
    <div className="flex flex-col w-full rounded-t-lg overflow-hidden">
      {/* Zone 1: Dark browser-style controls bar */}
      <div className="flex items-center gap-1.5 px-3 h-8 bg-[#2D3339]">
        <button className="p-1 rounded text-[#8F98A1] hover:text-white hover:bg-white/10 transition-colors">
          <ChevronLeft className="h-3.5 w-3.5 stroke-[1.5]" />
        </button>
        <button className="p-1 rounded text-[#8F98A1] hover:text-white hover:bg-white/10 transition-colors">
          <ChevronRight className="h-3.5 w-3.5 stroke-[1.5]" />
        </button>
        <div className="flex-1" />
        <button className="p-1 rounded text-[#8F98A1] hover:text-white hover:bg-white/10 transition-colors">
          <svg
            viewBox="0 0 16 16"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M13.5 8a5.5 5.5 0 1 1-1.8-4" />
            <path d="M13.5 2.5V6h-3" />
          </svg>
        </button>
      </div>

      {/* Zone 2: Branding area */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white">
        <div className="flex items-center justify-center w-8 h-8 rounded-[8px] bg-[#161B23] shrink-0">
          <svg
            viewBox="0 0 18 18"
            className="w-[18px] h-[18px]"
            fill="none"
            aria-hidden
          >
            <g fill="#4D8BFF">
              <rect x="2" y="2" width="14" height="2.5" rx="1" />
              <rect x="2" y="6" width="10" height="2.5" rx="1" />
              <rect x="2" y="10" width="7" height="2.5" rx="1" />
              <rect x="2" y="14" width="4" height="2.5" rx="1" />
            </g>
          </svg>
        </div>
        <span className="text-lg font-semibold text-[#0D1117] tracking-tight">
          Eleva
        </span>
      </div>

      {/* Zone 3: Workspace label with separator */}
      <div className="bg-white">
        <Separator className="bg-[#E1E4E8]" />
        <div className="px-4 py-1.5">
          <span className="text-[11px] font-medium tracking-[0.08em] text-[#6A737D]">
            WORKSPACE
          </span>
        </div>
      </div>
    </div>
  );
}
