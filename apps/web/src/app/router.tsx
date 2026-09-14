import { createBrowserRouter } from 'react-router';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { AppLayout } from './AppLayout';
import { ComingSoonPage } from './ComingSoonPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'proposals', element: <ComingSoonPage title="Proposals" day={7} /> },
      { path: 'templates', element: <ComingSoonPage title="Funder Templates" day={6} /> },
      { path: 'deadlines', element: <ComingSoonPage title="Deadlines" day={9} /> },
      { path: 'organization', element: <ComingSoonPage title="Organization Profile" day={5} /> },
      { path: '*', element: <ComingSoonPage title="Page not found" /> },
    ],
  },
]);
