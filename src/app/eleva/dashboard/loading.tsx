import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]" style={{ background: 'rgb(var(--eleva-bg))' }}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'rgb(var(--eleva-primary))' }} strokeWidth={2} />
        <span className="text-[13px] font-medium" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Loading dashboard...</span>
      </div>
    </div>
  );
}
