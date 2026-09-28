import { useQuery } from '@tanstack/react-query';
import { Card, PageTitle, ProgressRing, Spinner } from '../../components/ui';
import { NoOrganizationNotice, useOrgs } from '../organizations/OrgProvider';
import { profileApi } from './api';
import { ProfileForm } from './ProfileForm';

export function ProfilePage() {
  const { activeOrg, isLoading } = useOrgs();
  const orgId = activeOrg?.id ?? '';

  const profile = useQuery({
    queryKey: ['profile', orgId],
    queryFn: () => profileApi.get(orgId),
    enabled: Boolean(orgId),
  });

  if (isLoading) return <Spinner />;
  if (!activeOrg) return <NoOrganizationNotice />;

  const data = profile.data;
  const checks = [
    Boolean(data?.mission),
    Boolean(data?.beneficiaries),
    Boolean(data?.teamSummary),
    Boolean(data?.annualBudget),
    Boolean(data?.programs?.length),
    Boolean(data?.vision),
  ];
  const filled = checks.filter(Boolean).length;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-6">
        <PageTitle
          title="Organization profile"
          description="Everything the AI writes about you comes from here. Whatever is missing appears in drafts as a placeholder instead of being invented."
        />
        <ProfileForm orgId={orgId} />
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:h-fit lg:pt-24">
        <Card>
          <div className="flex items-center gap-4">
            <ProgressRing
              value={filled / checks.length}
              size={56}
              stroke={5}
              label={`${filled}/${checks.length}`}
            />
            <div>
              <div className="text-[14px] font-medium text-ink-900">
                {filled === checks.length ? 'Profile complete' : 'Profile in progress'}
              </div>
              <div className="text-[12.5px] text-ink-400">
                {filled === checks.length
                  ? 'Drafts have every fact they need.'
                  : 'More detail, fewer placeholders.'}
              </div>
            </div>
          </div>
        </Card>
        <div className="rounded-[11px] border border-line bg-paper-dark/60 p-5 text-[13px] leading-relaxed text-ink-600">
          <div className="mb-1.5 font-medium text-ink-900">What makes a strong profile</div>
          Numbers with a year (&ldquo;1,180 girls enrolled in 2025&rdquo;), programmes described by
          what changed for people, and the experience of the people who run them.
        </div>
      </aside>
    </div>
  );
}
