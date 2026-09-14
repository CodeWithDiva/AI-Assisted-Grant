import type { DocumentKind, ProcessingStatus } from '../enums';

export interface OrgDocument {
  id: string;
  kind: DocumentKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: ProcessingStatus;
  textLength: number;
  createdAt: string;
}

export const ACCEPTED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
] as const;
