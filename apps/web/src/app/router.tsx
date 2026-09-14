import { createBrowserRouter } from 'react-router';
import { AuthProvider } from '../features/auth/AuthProvider';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { RequireAuth } from '../features/auth/RequireAuth';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { OrganizationDetailPage } from '../features/organizations/OrganizationDetailPage';
import { OrganizationsPage } from '../features/organizations/OrganizationsPage';
import { AppLayout } from './AppLayout';
import { ComingSoonPage } from './ComingSoonPage';

export const router = createBrowserRouter([
  {
    element: <AuthProvider />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      {
        element: <RequireAuth />,
        children: [
          {
            path: '/',
            element: <AppLayout />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'proposals', element: <ComingSoonPage title="Proposals" day={7} /> },
              { path: 'templates', element: <ComingSoonPage title="Funder Templates" day={6} /> },
              { path: 'deadlines', element: <ComingSoonPage title="Deadlines" day={9} /> },
              { path: 'organization', element: <OrganizationsPage /> },
              { path: 'organization/:orgId', element: <OrganizationDetailPage /> },
              { path: '*', element: <ComingSoonPage title="Page not found" /> },
            ],
          },
        ],
      },
    ],
  },
]);
