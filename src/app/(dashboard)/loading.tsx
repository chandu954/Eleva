import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" strokeWidth={2} />
        <span className="text-sm font-medium text-gray-500">Loading...</span>
      </div>
    </div>
  );
}
