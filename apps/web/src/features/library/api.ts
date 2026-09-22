import type {
  CreateLibraryBlockInput,
  LibraryBlockView,
  UpdateLibraryBlockInput,
} from '@grant/shared';
import { apiFetch } from '../../lib/api';

export const libraryApi = {
  list: (orgId: string) => apiFetch<LibraryBlockView[]>(`/orgs/${orgId}/library`),
  create: (orgId: string, body: CreateLibraryBlockInput) =>
    apiFetch<LibraryBlockView>(`/orgs/${orgId}/library`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (orgId: string, blockId: string, body: UpdateLibraryBlockInput) =>
    apiFetch<LibraryBlockView>(`/orgs/${orgId}/library/${blockId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  remove: (orgId: string, blockId: string) =>
    apiFetch<void>(`/orgs/${orgId}/library/${blockId}`, { method: 'DELETE' }),
  markUsed: (orgId: string, blockId: string) =>
    apiFetch<void>(`/orgs/${orgId}/library/${blockId}/used`, { method: 'POST' }),
};

/**
 * Puts a passage where the cursor is, replacing any selection, as its own paragraph:
 * blank lines are added only where the neighbouring text needs them.
 */
export function insertPassage(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  passage: string,
): { text: string; cursor: number } {
  const before = text.slice(0, selectionStart).replace(/[ \t]+$/, '');
  const after = text.slice(selectionEnd).replace(/^[ \t]+/, '');
  const lead =
    before === '' ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  const trail =
    after === '' ? '' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
  const inserted = `${lead}${passage.trim()}${trail}`;
  return {
    text: before + inserted + after,
    cursor: before.length + lead.length + passage.trim().length,
  };
}
