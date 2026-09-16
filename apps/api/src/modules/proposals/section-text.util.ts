/** Section content is stored as `{ text }` JSON, so reading it is done in one place. */
export function readSectionText(content: unknown): string {
  if (content && typeof content === 'object' && 'text' in content) {
    const value = (content as { text?: unknown }).text;
    return typeof value === 'string' ? value : '';
  }
  return '';
}

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}
