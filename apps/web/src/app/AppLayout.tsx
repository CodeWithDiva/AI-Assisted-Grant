import { NavLink, Outlet } from 'react-router';

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/proposals', label: 'Proposals' },
  { to: '/templates', label: 'Funder Templates' },
  { to: '/deadlines', label: 'Deadlines' },
  { to: '/organization', label: 'Organization' },
];

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-slate-200 bg-white md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="px-5 py-4 text-lg font-semibold text-brand-700">GrantPilot</div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 px-4 py-6 md:px-8">
        <Outlet />
      </main>
    </div>
  );
}
