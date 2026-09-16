import { parseRichText, type TextRun } from '@grant/shared';
import { Bold, Eye, Italic, List, ListOrdered, PenLine } from 'lucide-react';
import type { RefObject } from 'react';

export type FormatKind = 'bold' | 'italic' | 'bullets' | 'numbers';

interface Edit {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

/** Applies a formatting action to the textarea's current selection and returns the new state. */
export function applyFormat(text: string, start: number, end: number, kind: FormatKind): Edit {
  if (kind === 'bold' || kind === 'italic') {
    const marker = kind === 'bold' ? '**' : '*';
    const selected = text.slice(start, end);
    const placeholder = kind === 'bold' ? 'bold text' : 'italic text';

    // Already wrapped: unwrap instead of nesting markers.
    if (
      selected &&
      text.slice(start - marker.length, start) === marker &&
      text.slice(end, end + marker.length) === marker
    ) {
      return {
        text: text.slice(0, start - marker.length) + selected + text.slice(end + marker.length),
        selectionStart: start - marker.length,
        selectionEnd: end - marker.length,
      };
    }

    const inner = selected || placeholder;
    return {
      text: text.slice(0, start) + marker + inner + marker + text.slice(end),
      selectionStart: start + marker.length,
      selectionEnd: start + marker.length + inner.length,
    };
  }

  // Lists work on whole lines touched by the selection.
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const nextBreak = text.indexOf('\n', end);
  const lineEnd = nextBreak === -1 ? text.length : nextBreak;
  const lines = text.slice(lineStart, lineEnd).split('\n');

  const pattern = kind === 'bullets' ? /^\s*[-*•]\s+/ : /^\s*\d+[.)]\s+/;
  const allFormatted = lines.every((line) => !line.trim() || pattern.test(line));

  let counter = 0;
  const updated = lines
    .map((line) => {
      if (!line.trim()) return line;
      const bare = line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '');
      if (allFormatted) return bare;
      counter += 1;
      return kind === 'bullets' ? `- ${bare}` : `${counter}. ${bare}`;
    })
    .join('\n');

  return {
    text: text.slice(0, lineStart) + updated + text.slice(lineEnd),
    selectionStart: lineStart,
    selectionEnd: lineStart + updated.length,
  };
}

export function FormattingToolbar({
  textareaRef,
  text,
  disabled,
  preview,
  onPreviewChange,
  onChange,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  text: string;
  disabled: boolean;
  preview: boolean;
  onPreviewChange: (preview: boolean) => void;
  onChange: (text: string) => void;
}) {
  const format = (kind: FormatKind) => {
    const area = textareaRef.current;
    if (!area) return;
    const edit = applyFormat(text, area.selectionStart, area.selectionEnd, kind);
    onChange(edit.text);
    // Restore focus and selection after React re-renders the new value.
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(edit.selectionStart, edit.selectionEnd);
    });
  };

  const tools: { kind: FormatKind; label: string; icon: typeof Bold; shortcut?: string }[] = [
    { kind: 'bold', label: 'Bold', icon: Bold, shortcut: 'Ctrl+B' },
    { kind: 'italic', label: 'Italic', icon: Italic, shortcut: 'Ctrl+I' },
    { kind: 'bullets', label: 'Bulleted list', icon: List },
    { kind: 'numbers', label: 'Numbered list', icon: ListOrdered },
  ];

  return (
    <div className="flex items-center gap-0.5 border-b border-line bg-paper/60 px-4 py-1.5">
      {tools.map((tool) => (
        <button
          key={tool.kind}
          type="button"
          disabled={disabled || preview}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => format(tool.kind)}
          title={tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label}
          aria-label={tool.label}
          className="inline-flex size-8 items-center justify-center rounded-md text-ink-600 hover:bg-paper-dark hover:text-ink-900 disabled:opacity-40"
        >
          <tool.icon className="size-4" strokeWidth={2} />
        </button>
      ))}
      <span className="mx-2 hidden h-4 w-px bg-line sm:block" />
      <span className="hidden text-[12px] text-ink-400 md:inline">
        Formatting carries into Word and PDF exports
      </span>
      <button
        type="button"
        onClick={() => onPreviewChange(!preview)}
        className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] text-ink-600 hover:bg-paper-dark hover:text-ink-900"
      >
        {preview ? <PenLine className="size-4" /> : <Eye className="size-4" />}
        {preview ? 'Edit' : 'Preview'}
      </button>
    </div>
  );
}

function Runs({ runs }: { runs: TextRun[] }) {
  return (
    <>
      {runs.map((run, index) => {
        let node: React.ReactNode = run.text;
        if (run.italic) node = <em>{node}</em>;
        if (run.bold) node = <strong className="font-semibold">{node}</strong>;
        return <span key={index}>{node}</span>;
      })}
    </>
  );
}

/** Shows the section the way it will read in the exported document. */
export function RichPreview({ text }: { text: string }) {
  const blocks = parseRichText(text);

  if (!blocks.length) {
    return <p className="px-6 py-5 text-ink-300 italic">Nothing written yet.</p>;
  }

  return (
    <div className="min-h-[340px] space-y-4 px-6 py-5 font-display text-[16.5px] leading-[1.75] text-ink-900">
      {blocks.map((block, index) =>
        block.type === 'paragraph' ? (
          <p key={index}>
            <Runs runs={block.runs} />
          </p>
        ) : block.type === 'bullets' ? (
          <ul key={index} className="list-disc space-y-1 pl-6 marker:text-ink-400">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>
                <Runs runs={item} />
              </li>
            ))}
          </ul>
        ) : (
          <ol key={index} className="list-decimal space-y-1 pl-6 marker:text-ink-400">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>
                <Runs runs={item} />
              </li>
            ))}
          </ol>
        ),
      )}
    </div>
  );
}
