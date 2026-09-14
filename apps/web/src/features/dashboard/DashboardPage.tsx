import type { HealthResponse } from '@grant/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

export function DashboardPage() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => apiFetch<HealthResponse>('/health'),
  });

  const apiLabel = health.isPending
    ? 'Checking…'
    : health.isError
      ? 'Unreachable'
      : health.data.status === 'ok'
        ? 'Online'
        : 'Degraded';

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-slate-600">Draft grant proposals and never miss a deadline.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <StatusCard label="API" value={apiLabel} ok={health.data?.status === 'ok'} />
        <StatusCard
          label="Database"
          value={health.data ? (health.data.database === 'up' ? 'Connected' : 'Down') : '—'}
          ok={health.data?.database === 'up'}
        />
      </div>
    </div>
  );
}

function StatusCard({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-lg font-medium">
        <span className={`size-2.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        {value}
      </div>
    </div>
  );
}
