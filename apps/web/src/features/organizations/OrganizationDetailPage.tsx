import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Spinner } from '../../components/ui';
import { DocumentsPanel } from '../documents/DocumentsPanel';
import { ProfileForm } from '../profile/ProfileForm';
import { organizationsApi } from './api';

type Tab = 'profile' | 'documents';

const tabs: { id: Tab; label: string; blurb: string }[] = [
  {
    id: 'profile',
    label: 'Profile',
    blurb: 'The facts the AI writes from. Anything missing becomes a placeholder in your drafts.',
  },
  {
    id: 'documents',
    label: 'Documents',
    blurb: 'Past proposals, reports and funder guidelines. Their text becomes source material.',
  },
];

export function OrganizationDetailPage() {
  const { orgId = '' } = useParams();
  const [tab, setTab] = useState<Tab>('profile');

  const organization = useQuery({
    queryKey: ['orgs', orgId],
    queryFn: () => organizationsApi.get(orgId),
    enabled: Boolean(orgId),
  });

  const current = tabs.find((item) => item.id === tab)!;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/organization" className="text-[13px] text-ink-400 hover:text-ink-900">
        ← Organizations
      </Link>

      <header className="mt-3 border-b border-line pb-4">
        <div className="eyebrow mb-2">Organization</div>
        <h1 className="font-display text-[27px] leading-tight text-ink-900">
          {organization.data?.name ?? 'Organization'}
        </h1>

        <nav className="mt-5 -mb-4 flex gap-1">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`-mb-px border-b-2 px-3 pb-3 text-[13.5px] transition-colors ${
                tab === item.id
                  ? 'border-accent-600 font-medium text-ink-900'
                  : 'border-transparent text-ink-400 hover:text-ink-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <p className="mt-4 max-w-2xl text-ink-600">{current.blurb}</p>

      <div className="mt-6">
        {organization.isPending ? (
          <Spinner />
        ) : tab === 'profile' ? (
          <ProfileForm orgId={orgId} />
        ) : (
          <DocumentsPanel orgId={orgId} />
        )}
      </div>
    </div>
  );
}
