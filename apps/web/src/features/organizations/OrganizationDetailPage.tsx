import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { DocumentsPanel } from '../documents/DocumentsPanel';
import { ProfileForm } from '../profile/ProfileForm';
import { organizationsApi } from './api';

type Tab = 'profile' | 'documents';

export function OrganizationDetailPage() {
  const { orgId = '' } = useParams();
  const [tab, setTab] = useState<Tab>('profile');

  const organization = useQuery({
    queryKey: ['orgs', orgId],
    queryFn: () => organizationsApi.get(orgId),
    enabled: Boolean(orgId),
  });

  return (
    <div className="max-w-3xl">
      <Link to="/organization" className="text-sm text-brand-600 hover:underline">
        ← All organizations
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{organization.data?.name ?? 'Organization'}</h1>

      <div className="mt-5 flex gap-2 border-b border-slate-200">
        <TabButton active={tab === 'profile'} onClick={() => setTab('profile')}>
          Profile
        </TabButton>
        <TabButton active={tab === 'documents'} onClick={() => setTab('documents')}>
          Documents
        </TabButton>
      </div>

      <div className="mt-6">
        {tab === 'profile' ? <ProfileForm orgId={orgId} /> : <DocumentsPanel orgId={orgId} />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
        active
          ? 'border-brand-600 text-brand-700'
          : 'border-transparent text-slate-600 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  );
}
