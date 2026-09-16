/**
 * Section text is stored as plain text with a small, markdown-like formatting vocabulary:
 *
 *   **bold**   *italic*   ***both***
 *   - bullet item          (also "* " or "• ")
 *   1. numbered item       (also "1) ")
 *   a blank line starts a new paragraph
 *
 * The same parser feeds the editor preview, the DOCX/PDF exports and the word count,
 * so all three always agree.
 */

export interface TextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

export type RichBlock =
  | { type: 'paragraph'; runs: TextRun[] }
  | { type: 'bullets'; items: TextRun[][] }
  | { type: 'numbers'; items: TextRun[][] };

const BULLET_LINE = /^\s*[-*•]\s+(.*)$/;
const NUMBER_LINE = /^\s*\d+[.)]\s+(.*)$/;
// ***both***, **bold**, *italic* — an italic marker must hug its text, so "3 * 4" stays plain.
const INLINE = /\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\*([^*\s](?:[^*]*[^*\s])?)\*/g;

export function parseInline(text: string): TextRun[] {
  const runs: TextRun[] = [];
  let last = 0;

  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) runs.push({ text: text.slice(last, index) });

    if (match[1] !== undefined) runs.push({ text: match[1], bold: true, italic: true });
    else if (match[2] !== undefined) runs.push({ text: match[2], bold: true });
    else runs.push({ text: match[3], italic: true });

    last = index + match[0].length;
  }

  if (last < text.length) runs.push({ text: text.slice(last) });
  return runs.filter((run) => run.text.length > 0);
}

export function parseRichText(text: string): RichBlock[] {
  const blocks: RichBlock[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: 'paragraph', runs: parseInline(paragraph.join(' ')) });
      paragraph = [];
    }
  };

  for (const rawLine of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      flushParagraph();
      // A blank line also ends a list, so two lists separated by a gap stay separate.
      blocks.push({ type: 'paragraph', runs: [] });
      continue;
    }

    const bullet = BULLET_LINE.exec(line);
    const number = bullet ? null : NUMBER_LINE.exec(line);

    if (bullet || number) {
      flushParagraph();
      const type = bullet ? 'bullets' : 'numbers';
      const item = parseInline((bullet ?? number)![1]);
      const previous = blocks[blocks.length - 1];
      if (previous?.type === type) previous.items.push(item);
      else blocks.push({ type, items: [item] });
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  // The empty paragraphs above were only separators.
  return blocks.filter((block) => block.type !== 'paragraph' || block.runs.length > 0);
}

function runsText(runs: TextRun[]): string {
  return runs.map((run) => run.text).join('');
}

/** The text with formatting markers removed — what a reader actually sees. */
export function plainText(text: string): string {
  return parseRichText(text)
    .map((block) =>
      block.type === 'paragraph' ? runsText(block.runs) : block.items.map(runsText).join('\n'),
    )
    .join('\n\n');
}

/** Words as a funder would count them: formatting markers and list bullets do not count. */
export function countWords(text: string): number {
  const plain = plainText(text).trim();
  return plain ? plain.split(/\s+/).length : 0;
}
