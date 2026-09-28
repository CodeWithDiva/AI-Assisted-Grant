import type { ProposalSummary } from '@grant/shared';
import { Award, Send, XCircle } from 'lucide-react';
import { ProgressRing } from '../../components/ui';

/** Writing progress while a proposal is open; once it is sent, what happened to it. */
export function StatusMark({ proposal }: { proposal: ProposalSummary }) {
  if (proposal.status === 'DRAFT' || proposal.status === 'IN_REVIEW') {
    return (
      <ProgressRing
        value={proposal.sectionCount ? proposal.completedSections / proposal.sectionCount : 0}
        size={40}
        label={`${proposal.completedSections}/${proposal.sectionCount}`}
      />
    );
  }
  const marks = {
    SUBMITTED: { icon: Send, className: 'bg-flag-blue-soft text-flag-blue' },
    AWARDED: { icon: Award, className: 'bg-flag-green-soft text-flag-green' },
    REJECTED: { icon: XCircle, className: 'bg-flag-red-soft text-flag-red' },
  } as const;
  const { icon: Icon, className } = marks[proposal.status];
  return (
    <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${className}`}>
      <Icon className="size-[18px]" strokeWidth={1.8} />
    </span>
  );
}
