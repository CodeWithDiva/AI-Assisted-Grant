import { createBrowserRouter } from 'react-router';
import { AuthProvider } from '../features/auth/AuthProvider';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { RequireAuth } from '../features/auth/RequireAuth';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { DeadlinesPage } from '../features/deadlines/DeadlinesPage';
import { OrganizationDetailPage } from '../features/organizations/OrganizationDetailPage';
import { OrganizationsPage } from '../features/organizations/OrganizationsPage';
import { NewProposalPage } from '../features/proposals/NewProposalPage';
import { ProposalEditorPage } from '../features/proposals/ProposalEditorPage';
import { ProposalsPage } from '../features/proposals/ProposalsPage';
import { OrgProvider } from '../features/organizations/OrgProvider';
import { TemplateDetailPage } from '../features/templates/TemplateDetailPage';
import { TemplatesPage } from '../features/templates/TemplatesPage';
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
            element: <OrgProvider />,
            children: [
              {
                path: '/',
                element: <AppLayout />,
                children: [
                  { index: true, element: <DashboardPage /> },
                  { path: 'proposals', element: <ProposalsPage /> },
                  { path: 'proposals/new', element: <NewProposalPage /> },
                  { path: 'proposals/:proposalId', element: <ProposalEditorPage /> },
                  { path: 'templates', element: <TemplatesPage /> },
                  { path: 'templates/:templateId', element: <TemplateDetailPage /> },
                  { path: 'deadlines', element: <DeadlinesPage /> },
                  { path: 'organization', element: <OrganizationsPage /> },
                  { path: 'organization/:orgId', element: <OrganizationDetailPage /> },
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
