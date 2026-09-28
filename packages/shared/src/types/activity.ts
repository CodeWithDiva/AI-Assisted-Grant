/** One line in an organization's activity trail. */
export interface ActivityEntry {
  id: string;
  /** e.g. "proposal.created", "member.role_changed". */
  action: string;
  entity: string;
  entityId: string | null;
  /** Safe extras only — names and states, never proposal text. */
  metadata: Record<string, string>;
  userName: string | null;
  at: string;
}
