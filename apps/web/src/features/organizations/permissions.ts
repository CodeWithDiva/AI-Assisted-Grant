import { OrgRole } from '@grant/shared';
import { useOrgs } from './OrgProvider';

/**
 * What the signed-in person may do in the organization they are looking at. The API enforces
 * the same rules; this keeps the interface honest, so nobody is offered a button that fails.
 */
export function usePermissions(): { role: OrgRole | null; canWrite: boolean; isOwner: boolean } {
  const { activeOrg } = useOrgs();
  const role = activeOrg?.role ?? null;
  return {
    role,
    canWrite: role === OrgRole.OWNER || role === OrgRole.EDITOR,
    isOwner: role === OrgRole.OWNER,
  };
}
