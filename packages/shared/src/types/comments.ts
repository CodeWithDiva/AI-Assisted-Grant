export interface ProposalCommentView {
  id: string;
  /** null when the note is about the whole proposal. */
  sectionId: string | null;
  sectionTitle: string | null;
  body: string;
  authorName: string | null;
  authorId: string | null;
  resolvedAt: string | null;
  resolvedByName: string | null;
  createdAt: string;
}

/** Who approved a proposal for submission, and when. */
export interface ApprovalView {
  approvedAt: string | null;
  approvedByName: string | null;
}
