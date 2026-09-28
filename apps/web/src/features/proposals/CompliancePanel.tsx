import { useMutation } from '@tanstack/react-query';
import { Alert, Button, SectionLabel } from '../../components/ui';
import { proposalsApi } from './api';

export function CompliancePanel({
  orgId,
  proposalId,
  onJumpToSection,
}: {
  orgId: string;
  proposalId: string;
  onJumpToSection: (sectionId: string) => void;
}) {
  const check = useMutation({ mutationFn: () => proposalsApi.compliance(orgId, proposalId) });
  const fit = useMutation({ mutationFn: () => proposalsApi.fitScore(orgId, proposalId) });

  const report = check.data;
  const errors = report?.issues.filter((issue) => issue.severity === 'ERROR') ?? [];
  const warnings = report?.issues.filter((issue) => issue.severity === 'WARNING') ?? [];

  return (
    <section className="mt-6 rounded-lg border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-4">
        <SectionLabel className="mr-auto">Review</SectionLabel>
        <Button
          variant="primary"
          size="sm"
          onClick={() => check.mutate()}
          disabled={check.isPending}
        >
          {check.isPending ? 'Reviewing…' : 'Check the draft'}
        </Button>
        <Button size="sm" onClick={() => fit.mutate()} disabled={fit.isPending}>
          {fit.isPending ? 'Scoring…' : 'Funder fit'}
        </Button>
      </div>

      <div className="space-y-5 px-5 py-5">
        <Alert>{check.error?.message ?? fit.error?.message}</Alert>

        {fit.data ? (
          <div className="rounded-md border border-line p-4">
            <div className="flex items-baseline gap-2">
              <span className="tabular font-display text-[32px] leading-none text-ink-900">
                {fit.data.score}
              </span>
              <span className="text-[13px] text-ink-400">/ 100 fit with this funder</span>
            </div>
            {fit.data.reasons.length ? (
              <ul className="mt-3 space-y-1.5 text-[13.5px] text-ink-800">
                {fit.data.reasons.map((reason, index) => (
                  <li key={index} className="flex gap-2.5">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-accent-600" />
                    {reason}
                  </li>
                ))}
              </ul>
            ) : null}
            {fit.data.gaps.length ? (
              <>
                <SectionLabel className="mt-4 mb-1.5">Gaps to close</SectionLabel>
                <ul className="space-y-1.5 text-[13.5px] text-ink-600">
                  {fit.data.gaps.map((gap, index) => (
                    <li key={index} className="flex gap-2.5">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-line-strong" />
                      {gap}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : null}

        {report ? (
          <>
            <p className="border-l-2 border-accent-300 pl-3 font-display text-[15.5px] leading-relaxed text-ink-800">
              {report.summary}
            </p>

            {errors.length === 0 && warnings.length === 0 ? (
              <Alert tone="green">
                Nothing to fix — every section is within its limits, filled in, and free of
                placeholders.
              </Alert>
            ) : null}

            {[
              { label: 'Must fix', items: errors, tone: 'border-flag-red' },
              { label: 'Worth a look', items: warnings, tone: 'border-flag-amber' },
            ]
              .filter((group) => group.items.length)
              .map((group) => (
                <div key={group.label}>
                  <SectionLabel className="mb-2">
                    {group.label} ({group.items.length})
                  </SectionLabel>
                  <ul className="space-y-1.5">
                    {group.items.map((issue, index) => (
                      <li
                        key={index}
                        className={`border-l-2 bg-paper py-2 pr-3 pl-3 text-[13.5px] ${group.tone}`}
                      >
                        {issue.sectionTitle ? (
                          <span className="font-medium text-ink-900">{issue.sectionTitle}: </span>
                        ) : null}
                        <span className="text-ink-600">{issue.message}</span>
                        {issue.sectionId ? (
                          <button
                            type="button"
                            onClick={() => onJumpToSection(issue.sectionId!)}
                            className="ml-2 text-accent-600 hover:underline"
                          >
                            open
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

            {report.criteria.length ? (
              <div>
                <SectionLabel className="mb-2">
                  Scored against the funder&apos;s criteria
                </SectionLabel>
                <ul className="divide-y divide-line rounded-md border border-line">
                  {report.criteria.map((criterion, index) => (
                    <li key={index} className="px-4 py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[14px] font-medium text-ink-900">
                          {criterion.name}
                        </span>
                        <span className="tabular shrink-0 font-mono text-[12px] text-ink-400">
                          {criterion.score}/{criterion.maxScore}
                        </span>
                      </div>
                      <p className="mt-1 text-[13.5px] text-ink-600">{criterion.comment}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
