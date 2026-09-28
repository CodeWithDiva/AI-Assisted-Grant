/**
 * Which handlers are worth recording in an organization's activity trail, and under what
 * name. Reads and downloads are left out; so is the AI usage log, which the admin pages
 * report separately.
 */
const ACTIONS: Record<string, string> = {
  'ProposalsController.create': 'proposal.created',
  'ProposalsController.update': 'proposal.updated',
  'ProposalsController.remove': 'proposal.deleted',
  'ProposalsController.saveSection': 'section.saved',
  'ProposalsController.generate': 'section.drafted',
  'ProposalsController.refine': 'section.refined',
  'ProposalsController.restore': 'section.restored',
  'TemplatesController.extract': 'template.imported',
  'TemplatesController.create': 'template.created',
  'TemplatesController.update': 'template.updated',
  'TemplatesController.remove': 'template.deleted',
  'DocumentsController.upload': 'document.uploaded',
  'DocumentsController.remove': 'document.deleted',
  'LibraryController.create': 'library.created',
  'LibraryController.update': 'library.updated',
  'LibraryController.remove': 'library.deleted',
  'DeadlinesController.create': 'deadline.created',
  'DeadlinesController.update': 'deadline.updated',
  'DeadlinesController.remove': 'deadline.deleted',
  'ExportsController.create': 'export.created',
  'ProfileController.update': 'profile.updated',
  'OrganizationsController.update': 'organization.updated',
  'OrganizationsController.invite': 'member.invited',
  'OrganizationsController.revokeInvitation': 'invitation.revoked',
  'OrganizationsController.accept': 'member.joined',
  'OrganizationsController.updateMemberRole': 'member.role_changed',
  'OrganizationsController.removeMember': 'member.removed',
};

/** Saves in the editor are frequent; one entry per section per 10 minutes is enough. */
export const COLLAPSED_ACTIONS = new Set(['section.saved']);

export function actionFor(controller: string, handler: string): string | null {
  return ACTIONS[`${controller}.${handler}`] ?? null;
}

/** Fields that are safe to keep alongside an entry: names and states, never proposal text. */
const SAFE_FIELDS = [
  'title',
  'name',
  'status',
  'fileName',
  'role',
  'email',
  'category',
  'format',
] as const;

const ID_PARAMS = [
  'proposalId',
  'templateId',
  'documentId',
  'deadlineId',
  'blockId',
  'membershipId',
  'invitationId',
  'sectionId',
  'exportId',
] as const;

export function detailsOf(
  body: unknown,
  params: Record<string, unknown>,
): { entityId: string | null; metadata: Record<string, string> } {
  const record = (body ?? {}) as Record<string, unknown>;
  const metadata: Record<string, string> = {};
  for (const field of SAFE_FIELDS) {
    const value = record[field];
    if (typeof value === 'string' && value) metadata[field] = value.slice(0, 200);
  }

  const fromResponse = typeof record.id === 'string' ? record.id : null;
  const fromParams = ID_PARAMS.map((name) => params[name]).find(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );

  return { entityId: fromResponse ?? fromParams ?? null, metadata };
}
