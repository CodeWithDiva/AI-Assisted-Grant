import { countWords } from '@grant/shared';

/** Section content is stored as `{ text }` JSON, so reading it is done in one place. */
export function readSectionText(content: unknown): string {
  if (content && typeof content === 'object' && 'text' in content) {
    const value = (content as { text?: unknown }).text;
    return typeof value === 'string' ? value : '';
  }
  return '';
}

/** Shared with the web editor, so both count words identically (formatting markers excluded). */
export { countWords };
