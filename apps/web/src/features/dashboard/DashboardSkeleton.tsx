import { Skeleton } from '../../components/ui';

/** The dashboard's own shape in grey while its data loads, so nothing jumps when it arrives. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading your workspace">
      <div className="space-y-2.5">
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <Skeleton className="h-[248px] rounded-[11px]" />
        <Skeleton className="h-[248px] rounded-[11px]" />
      </div>
      <Skeleton className="h-[170px] rounded-[11px]" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Skeleton className="h-[260px] rounded-[11px]" />
        <Skeleton className="h-[260px] rounded-[11px]" />
      </div>
    </div>
  );
}
