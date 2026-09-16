import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../features/auth/AuthProvider';
import { useOrgs } from '../features/organizations/OrgProvider';
import { Wordmark } from './Wordmark';

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/proposals', label: 'Proposals' },
  { to: '/templates', label: 'Funder templates' },
  { to: '/deadlines', label: 'Deadlines' },
  { to: '/organization', label: 'Organization' },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const { organizations, activeOrg, setActiveOrgId } = useOrgs();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const initials = (user?.name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-line bg-paper-dark/70 lg:h-screen lg:w-64 lg:border-r lg:border-b-0">
        <div className="px-5 pt-5 pb-4">
          <Wordmark />
        </div>

        {organizations.length > 0 ? (
          <div className="px-4 pb-4">
            <label className="block">
              <span className="eyebrow mb-1.5 block">Organization</span>
              <select
                value={activeOrg?.id ?? ''}
                onChange={(event) => setActiveOrgId(event.target.value)}
                className="w-full rounded-md border border-line-strong bg-surface px-2.5 py-1.5 text-[13.5px] text-ink-900 focus:border-accent-600 focus:outline-none"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `relative rounded-md px-3 py-2 text-[13.5px] whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-surface font-medium text-ink-900 shadow-[inset_2px_0_0_0_var(--color-accent-600)]'
                    : 'text-ink-600 hover:bg-surface/70 hover:text-ink-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto hidden items-center gap-3 border-t border-line px-5 py-4 lg:flex">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-900 font-mono text-[11px] text-white">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-ink-900">{user?.name}</div>
            <button
              type="button"
              onClick={onLogout}
              className="text-[12.5px] text-ink-400 hover:text-ink-900 hover:underline"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-5 py-7 lg:h-screen lg:overflow-y-auto lg:px-10 lg:py-9">
        <Outlet />
      </main>
    </div>
  );
}
