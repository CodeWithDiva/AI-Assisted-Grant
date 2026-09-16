import { PageTitle, Spinner } from '../../components/ui';
import { NoOrganizationNotice, useOrgs } from '../organizations/OrgProvider';
import { DocumentsPanel } from './DocumentsPanel';

export function DocumentsPage() {
  const { activeOrg, isLoading } = useOrgs();

  if (isLoading) return <Spinner />;
  if (!activeOrg) return <NoOrganizationNotice />;

  return (
    <div className="space-y-6">
      <PageTitle
        title="Documents"
        description="Past proposals, annual reports and funder guidelines. Their text becomes source material, so drafts reuse your own wording and figures."
      />
      <DocumentsPanel orgId={activeOrg.id} />
    </div>
  );
}
