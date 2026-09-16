import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Link, Outlet } from 'react-router';
import { EmptyState } from '../../components/ui';
import { organizationsApi, type Organization } from './api';

const STORAGE_KEY = 'gp_active_org';

interface OrgContextValue {
  organizations: Organization[];
  activeOrg: Organization | null;
  setActiveOrgId: (id: string) => void;
  isLoading: boolean;
}

const OrgContext = createContext<OrgContextValue | null>(null);

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function OrgProvider() {
  const [activeOrgId, setActiveOrgId] = useState<string | null>(readStored);

  const organizations = useQuery({ queryKey: ['orgs'], queryFn: organizationsApi.list });

  // Fall back to the first organization when nothing is stored, or the stored one is gone.
  useEffect(() => {
    const list = organizations.data;
    if (!list?.length) return;
    if (!activeOrgId || !list.some((org) => org.id === activeOrgId)) {
      setActiveOrgId(list[0].id);
    }
  }, [organizations.data, activeOrgId]);

  useEffect(() => {
    if (!activeOrgId) return;
    try {
      localStorage.setItem(STORAGE_KEY, activeOrgId);
    } catch {
      // Private browsing — the choice just won't be remembered.
    }
  }, [activeOrgId]);

  const value = useMemo<OrgContextValue>(
    () => ({
      organizations: organizations.data ?? [],
      activeOrg: organizations.data?.find((org) => org.id === activeOrgId) ?? null,
      setActiveOrgId,
      isLoading: organizations.isPending,
    }),
    [organizations.data, organizations.isPending, activeOrgId],
  );

  return (
    <OrgContext.Provider value={value}>
      <Outlet />
    </OrgContext.Provider>
  );
}

export function useOrgs(): OrgContextValue {
  const context = useContext(OrgContext);
  if (!context) throw new Error('useOrgs must be used inside OrgProvider');
  return context;
}

/** Shown by every organization-scoped page until an organization exists. */
export function NoOrganizationNotice() {
  return (
    <div className="mx-auto max-w-2xl pt-6">
      <EmptyState
        title="Start with an organization"
        action={
          <Link
            to="/organizations"
            className="inline-flex h-9 items-center rounded-md border border-accent-700 bg-accent-600 px-4 text-[13.5px] font-medium text-white hover:bg-accent-700"
          >
            Create an organization
          </Link>
        }
      >
        Proposals, templates and deadlines all belong to one — your nonprofit, your company, or a
        client you write for.
      </EmptyState>
    </div>
  );
}
