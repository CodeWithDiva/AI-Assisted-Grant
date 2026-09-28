/** One item in the bell menu. `payload` carries whatever the type needs to render a line. */
export interface NotificationView {
  id: string;
  /** e.g. "COMMENT_ADDED", "PROPOSAL_APPROVED", "DEADLINE_REMINDER", "MEMBER_JOINED". */
  type: string;
  payload: Record<string, string | number | null>;
  readAt: string | null;
  createdAt: string;
}
