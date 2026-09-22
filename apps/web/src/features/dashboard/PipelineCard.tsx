import type { ProposalStatus, ProposalSummary } from '@grant/shared';
import { TrendingUp } from 'lucide-react';
import { Card, CardHeader, formatMoney } from '../../components/ui';
import { statusLabels } from '../proposals/status';

const PIPELINE: { status: ProposalStatus; bar: string }[] = [
  { status: 'DRAFT', bar: 'bg-ink-300' },
  { status: 'IN_REVIEW', bar: 'bg-brass' },
  { status: 'SUBMITTED', bar: 'bg-flag-blue' },
  { status: 'AWARDED', bar: 'bg-accent-600' },
  { status: 'REJECTED', bar: 'bg-flag-red/70' },
];

export function PipelineCard({ proposals }: { proposals: ProposalSummary[] }) {
  const total = proposals.length;
  const currency = proposals.find((p) => p.currency)?.currency ?? 'USD';

  const rows = PIPELINE.map((stage) => {
    const items = proposals.filter((p) => p.status === stage.status);
    return {
      ...stage,
      count: items.length,
      amount: items.reduce((sum, p) => sum + (p.requestedAmount ?? 0), 0),
    };
  });

  return (
    <Card padded={false}>
      <CardHeader
        title="Pipeline"
        icon={TrendingUp}
        action={
          <span className="text-[13px] text-ink-400">
            {total} proposal{total === 1 ? '' : 's'}
          </span>
        }
      />
      <div className="px-5 py-5">
        <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-paper-dark">
          {total
            ? rows
                .filter((row) => row.count)
                .map((row) => (
                  <div
                    key={row.status}
                    className={row.bar}
                    style={{ width: `${(row.count / total) * 100}%` }}
                    title={`${statusLabels[row.status]}: ${row.count}`}
                  />
                ))
            : null}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-5">
          {rows.map((row) => (
            <div key={row.status}>
              <div className="flex items-center gap-2 text-[12.5px] text-ink-600">
                <span className={`size-2 rounded-full ${row.bar}`} />
                {statusLabels[row.status]}
              </div>
              <div className="tabular mt-1 text-[22px] leading-tight font-semibold text-ink-900">
                {row.count}
              </div>
              <div className="tabular text-[12.5px] text-ink-400">
                {row.amount ? formatMoney(row.amount, currency) : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function FundingCard({ proposals }: { proposals: ProposalSummary[] }) {
  const currency = proposals.find((p) => p.currency)?.currency ?? 'USD';
  const sum = (statuses: ProposalStatus[]) =>
    proposals
      .filter((p) => statuses.includes(p.status))
      .reduce((total, p) => total + (p.requestedAmount ?? 0), 0);
  const decided = proposals.filter((p) => p.status === 'AWARDED' || p.status === 'REJECTED').length;
  const awarded = proposals.filter((p) => p.status === 'AWARDED').length;

  return (
    <Card>
      <div className="eyebrow">Funding</div>
      <div className="mt-4 space-y-4">
        <div>
          <div className="text-[12.5px] text-ink-400">Awarded</div>
          <div className="tabular text-[26px] font-semibold text-accent-700">
            {formatMoney(sum(['AWARDED']), currency)}
          </div>
        </div>
        <div>
          <div className="text-[12.5px] text-ink-400">Requested and still open</div>
          <div className="tabular text-[20px] font-semibold text-ink-900">
            {formatMoney(sum(['DRAFT', 'IN_REVIEW', 'SUBMITTED']), currency)}
          </div>
        </div>
        <div>
          <div className="text-[12.5px] text-ink-400">Success rate</div>
          <div className="tabular text-[20px] font-semibold text-ink-900">
            {decided ? `${Math.round((awarded / decided) * 100)}%` : '—'}
          </div>
        </div>
      </div>
    </Card>
  );
}
