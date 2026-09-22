import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  CalendarClock,
  ChevronRight,
  ChevronsUpDown,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Menu as MenuIcon,
  Plus,
  Settings,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Avatar, Button, Menu, Spinner } from '../components/ui';
import { authApi } from '../features/auth/api';
import { useAuth } from '../features/auth/AuthProvider';
import { useOrgs } from '../features/organizations/OrgProvider';
import { Wordmark } from './Wordmark';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const navGroups: { label?: string; items: NavItem[] }[] = [
  { items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
  {
    label: 'Writing',
    items: [
      { to: '/proposals', label: 'Proposals', icon: FileText },
      { to: '/deadlines', label: 'Deadlines', icon: CalendarClock },
    ],
  },
  {
    label: 'Library',
    items: [
      { to: '/templates', label: 'Funder templates', icon: LibraryBig },
      { to: '/documents', label: 'Documents', icon: FolderOpen },
    ],
  },
  {
    label: 'Organization',
    items: [
      { to: '/profile', label: 'Profile', icon: Building2 },
      { to: '/team', label: 'Team', icon: Users },
    ],
  },
];

const sectionTitles: [RegExp, string][] = [
  [/^\/$/, 'Dashboard'],
  [/^\/proposals\/new/, 'New proposal'],
  [/^\/proposals\/.+/, 'Proposal'],
  [/^\/proposals/, 'Proposals'],
  [/^\/deadlines/, 'Deadlines'],
  [/^\/templates\/.+/, 'Template'],
  [/^\/templates/, 'Funder templates'],
  [/^\/documents/, 'Documents'],
  [/^\/profile/, 'Profile'],
  [/^\/team/, 'Team'],
  [/^\/settings/, 'Settings'],
  [/^\/organizations/, 'Organizations'],
];

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer whenever the page changes.
  useEffect(() => setDrawerOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen lg:grid lg:h-screen lg:grid-cols-[252px_1fr] lg:overflow-hidden">
      {drawerOpen ? (
        <div
          className="fixed inset-0 z-30 bg-night-950/40 lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
      ) : null}

      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex min-w-0 flex-col lg:h-screen">
        <TopBar onOpenMenu={() => setDrawerOpen(true)} />
        <main className="flex-1 lg:overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-5 py-7 lg:px-10 lg:py-9">
            <Suspense fallback={<Spinner />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: authApi.health,
    staleTime: 5 * 60_000,
  });

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col bg-night-900 text-white transition-transform lg:static lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <Wordmark tone="light" />
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-white/60 hover:text-white lg:hidden"
          aria-label="Close menu"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="px-3 pb-2">
        <OrgSwitcher />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {navGroups.map((group, index) => (
          <div key={group.label ?? index} className={index > 0 ? 'mt-5' : ''}>
            {group.label ? (
              <div className="mb-1.5 px-2.5 font-mono text-[10.5px] tracking-[0.1em] text-white/35 uppercase">
                {group.label}
              </div>
            ) : null}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `group flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13.5px] transition-colors ${
                        isActive
                          ? 'bg-white/[0.09] font-medium text-white'
                          : 'text-white/60 hover:bg-white/[0.05] hover:text-white'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={`size-[17px] ${isActive ? 'text-accent-300' : 'text-white/45 group-hover:text-white/70'}`}
                          strokeWidth={1.8}
                        />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.08] px-3 py-3">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13.5px] ${
              isActive
                ? 'bg-white/[0.09] text-white'
                : 'text-white/60 hover:bg-white/[0.05] hover:text-white'
            }`
          }
        >
          <Settings className="size-[17px] text-white/45" strokeWidth={1.8} />
          Settings
        </NavLink>

        {health.data ? (
          <div
            className="mt-2 flex items-center gap-2 px-2.5 text-[12px] text-white/45"
            title={health.data.aiProvider ?? 'No AI provider configured'}
          >
            <span
              className={`size-1.5 rounded-full ${
                health.data.ai === 'configured' ? 'bg-accent-300' : 'bg-brass'
              }`}
            />
            {health.data.ai === 'configured' ? 'AI drafting ready' : 'AI not set up'}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function OrgSwitcher() {
  const { organizations, activeOrg, setActiveOrgId } = useOrgs();
  const navigate = useNavigate();

  if (!organizations.length) {
    return (
      <button
        type="button"
        onClick={() => navigate('/organizations')}
        className="flex w-full items-center gap-2 rounded-lg border border-dashed border-white/20 px-3 py-2.5 text-[13px] text-white/70 hover:border-white/40 hover:text-white"
      >
        <Plus className="size-4" /> Create an organization
      </button>
    );
  }

  return (
    <Menu
      width="w-[228px]"
      trigger={(open) => (
        <button
          type="button"
          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
            open ? 'bg-white/[0.1]' : 'bg-white/[0.05] hover:bg-white/[0.08]'
          }`}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brass font-display text-[15px] text-night-950">
            {activeOrg?.name.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-medium text-white">
              {activeOrg?.name}
            </span>
            <span className="block text-[11.5px] text-white/45 capitalize">
              {activeOrg?.role?.toLowerCase() ?? 'member'}
            </span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-white/40" />
        </button>
      )}
      items={organizations.map((org) => ({
        label: org.name,
        description: org.role ? org.role.charAt(0) + org.role.slice(1).toLowerCase() : undefined,
        selected: org.id === activeOrg?.id,
        onSelect: () => setActiveOrgId(org.id),
      }))}
      footer={
        <button
          type="button"
          onClick={() => navigate('/organizations')}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] text-ink-600 hover:bg-paper"
        >
          <Plus className="size-4 text-ink-400" /> New or manage organizations
        </button>
      }
    />
  );
}

function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user, logout } = useAuth();
  const { activeOrg } = useOrgs();
  const location = useLocation();
  const navigate = useNavigate();

  const section = sectionTitles.find(([pattern]) => pattern.test(location.pathname))?.[1] ?? '';
  const showNewProposal =
    activeOrg &&
    location.pathname !== '/proposals' &&
    !location.pathname.startsWith('/proposals/new');

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-paper/90 px-5 backdrop-blur lg:px-10">
      <button
        type="button"
        onClick={onOpenMenu}
        className="-ml-1 rounded p-1 text-ink-600 hover:text-ink-900 lg:hidden"
        aria-label="Open menu"
      >
        <MenuIcon className="size-5" />
      </button>

      <nav className="flex min-w-0 items-center gap-1.5 text-[13.5px]" aria-label="Breadcrumb">
        {activeOrg ? (
          <>
            <span className="hidden truncate text-ink-400 sm:inline">{activeOrg.name}</span>
            <ChevronRight className="hidden size-3.5 shrink-0 text-ink-300 sm:inline" />
          </>
        ) : null}
        <span className="truncate font-medium text-ink-900">{section}</span>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {showNewProposal ? (
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => navigate('/proposals/new')}
          >
            <span className="hidden sm:inline">New proposal</span>
          </Button>
        ) : null}

        <Menu
          align="right"
          width="w-56"
          trigger={() => (
            <button type="button" className="rounded-full" aria-label="Account menu">
              <Avatar name={user?.name ?? '?'} />
            </button>
          )}
          items={[
            {
              label: user?.name ?? '',
              description: user?.email,
              onSelect: () => navigate('/settings'),
            },
            { label: 'Settings', icon: Settings, onSelect: () => navigate('/settings') },
            {
              label: 'Sign out',
              icon: LogOut,
              tone: 'danger',
              onSelect: async () => {
                await logout();
                navigate('/login', { replace: true });
              },
            },
          ]}
        />
      </div>
    </header>
  );
}
