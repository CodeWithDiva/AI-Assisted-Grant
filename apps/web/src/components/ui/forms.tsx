/** Form controls, including the drag-and-drop file picker. */
import { ChevronDown, UploadCloud } from 'lucide-react';
import {
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

/**
 * Drag-and-drop file picker. Clicking or pressing Enter opens the file dialog; a dropped
 * file is checked against `accept` before it is handed on.
 */
export function FileDrop({
  accept,
  hint,
  onFile,
  busy = false,
  busyLabel = 'Uploading',
  disabled = false,
}: {
  accept: string;
  hint: string;
  onFile: (file: File) => void;
  busy?: boolean;
  busyLabel?: string;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string | null>(null);
  const inactive = disabled || busy;
  const extensions = accept.split(',').map((ext) => ext.trim().toLowerCase());

  const take = (file: File | undefined) => {
    if (!file || inactive) return;
    const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!extensions.includes(ext)) {
      setRejected(`${file.name} is not a supported file type.`);
      return;
    }
    setRejected(null);
    onFile(file);
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={inactive ? -1 : 0}
        aria-disabled={inactive}
        onClick={() => !inactive && input.current?.click()}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && !inactive) {
            event.preventDefault();
            input.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!inactive) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          take(event.dataTransfer.files[0]);
        }}
        className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-6 py-7 text-center transition-colors focus-visible:ring-3 focus-visible:ring-accent-100 focus-visible:outline-none ${
          dragging
            ? 'border-accent-500 bg-accent-50'
            : 'border-line-strong bg-paper/60 hover:border-accent-500 hover:bg-accent-50/50'
        } ${inactive ? 'cursor-default opacity-70' : 'cursor-pointer'}`}
      >
        {busy ? (
          <span className="size-5 animate-spin rounded-full border-2 border-line-strong border-t-accent-600" />
        ) : (
          <UploadCloud className="size-6 text-accent-600" strokeWidth={1.6} />
        )}
        <p className="text-[14px] text-ink-800">
          {busy ? (
            `${busyLabel}…`
          ) : (
            <>
              <span className="font-medium text-accent-700">Choose a file</span> or drag it here
            </>
          )}
        </p>
        <p className="text-[12.5px] text-ink-400">{hint}</p>
        <input
          ref={input}
          type="file"
          accept={accept}
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose a file"
          onChange={(event) => {
            take(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </div>
      {rejected ? <p className="mt-2 text-[12.5px] text-flag-red">{rejected}</p> : null}
    </div>
  );
}

export const controlClass =
  'w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-[14px] text-ink-900 shadow-[inset_0_1px_1px_rgb(21_23_27/0.03)] placeholder:text-ink-300 focus:border-accent-500 focus:ring-3 focus:ring-accent-100 focus:outline-none disabled:bg-paper-dark';

export function Label({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-[13px] font-medium text-ink-800">{children}</span>;
}

export function Field({
  label,
  hint,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className={`block ${className}`}>
      <Label>{label}</Label>
      <input {...props} className={controlClass} />
      {hint ? <span className="mt-1.5 block text-[12.5px] text-ink-400">{hint}</span> : null}
    </label>
  );
}

export function TextArea({
  label,
  hint,
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string }) {
  return (
    <label className={`block ${className}`}>
      {label ? <Label>{label}</Label> : null}
      <textarea {...props} className={`${controlClass} resize-y leading-relaxed`} />
      {hint ? <span className="mt-1.5 block text-[12.5px] text-ink-400">{hint}</span> : null}
    </label>
  );
}

export function Select({
  label,
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className={`block ${className}`}>
      {label ? <Label>{label}</Label> : null}
      <span className="relative block">
        <select {...props} className={`${controlClass} appearance-none pr-9`}>
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-400"
          strokeWidth={1.8}
        />
      </span>
    </label>
  );
}
