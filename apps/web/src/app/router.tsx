import { lazy, type ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { AuthProvider } from '../features/auth/AuthProvider';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { RequireAuth } from '../features/auth/RequireAuth';
import { OrgProvider } from '../features/organizations/OrgProvider';
import { AppLayout } from './AppLayout';
import { ComingSoonPage } from './ComingSoonPage';

/** Each page is its own chunk, so the first load only downloads what it shows. */
function page(loader: () => Promise<Record<string, unknown>>, name: string) {
  const Component = lazy(async () => ({ default: (await loader())[name] as ComponentType }));
  return <Component />;
}

export const router = createBrowserRouter([
  {
    element: <AuthProvider />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      {
        path: '/invite/:token',
        element: page(() => import('../features/team/AcceptInvitePage'), 'AcceptInvitePage'),
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <OrgProvider />,
            children: [
              {
                path: '/',
                element: <AppLayout />,
                children: [
                  {
                    index: true,
                    element: page(
                      () => import('../features/dashboard/DashboardPage'),
                      'DashboardPage',
                    ),
                  },
                  {
                    path: 'proposals',
                    element: page(
                      () => import('../features/proposals/ProposalsPage'),
                      'ProposalsPage',
                    ),
                  },
                  {
                    path: 'proposals/new',
                    element: page(
                      () => import('../features/proposals/NewProposalPage'),
                      'NewProposalPage',
                    ),
                  },
                  {
                    path: 'proposals/:proposalId',
                    element: page(
                      () => import('../features/proposals/ProposalEditorPage'),
                      'ProposalEditorPage',
                    ),
                  },
                  {
                    path: 'deadlines',
                    element: page(
                      () => import('../features/deadlines/DeadlinesPage'),
                      'DeadlinesPage',
                    ),
                  },
                  {
                    path: 'templates',
                    element: page(
                      () => import('../features/templates/TemplatesPage'),
                      'TemplatesPage',
                    ),
                  },
                  {
                    path: 'templates/:templateId',
                    element: page(
                      () => import('../features/templates/TemplateDetailPage'),
                      'TemplateDetailPage',
                    ),
                  },
                  {
                    path: 'documents',
                    element: page(
                      () => import('../features/documents/DocumentsPage'),
                      'DocumentsPage',
                    ),
                  },
                  {
                    path: 'profile',
                    element: page(() => import('../features/profile/ProfilePage'), 'ProfilePage'),
                  },
                  {
                    path: 'team',
                    element: page(() => import('../features/team/TeamPage'), 'TeamPage'),
                  },
                  {
                    path: 'settings',
                    element: page(
                      () => import('../features/settings/SettingsPage'),
                      'SettingsPage',
                    ),
                  },
                  {
                    path: 'organizations',
                    element: page(
                      () => import('../features/organizations/OrganizationsPage'),
                      'OrganizationsPage',
                    ),
                  },
                  // Addresses used by earlier versions of the app.
                  { path: 'organization', element: <Navigate to="/organizations" replace /> },
                  { path: 'organization/:orgId', element: <Navigate to="/profile" replace /> },
                  { path: '*', element: <ComingSoonPage title="Page not found" /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);
