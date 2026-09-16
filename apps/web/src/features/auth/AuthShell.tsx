import { CalendarClock, Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { Wordmark } from '../../app/Wordmark';

/**
 * Sign-in and sign-up share one layout: a dark panel that shows what the product does
 * (a miniature of the editor, drawn in HTML) and the form on the right.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-paper lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-night-900 px-12 py-11 text-white lg:flex lg:flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-40 size-[520px] rounded-full bg-accent-600/25 blur-3xl"
        />
        <Wordmark tone="light" />

        <div className="relative my-auto max-w-[460px] py-10">
          <h2 className="font-display text-[38px] leading-[1.15] tracking-[-0.01em]">
            Grant proposals in the funder&apos;s format, written from your own facts.
          </h2>

          <div className="relative mt-10 mb-12">
            <div className="rotate-[-1.5deg] rounded-[11px] bg-surface p-5 text-ink-800 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.6)]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-[0.1em] text-ink-400 uppercase">
                  Section 2 of 6
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-flag-green-soft px-2 py-0.5 text-[11px] font-medium text-flag-green">
                  <Check className="size-3" strokeWidth={2.5} /> Within limit
                </span>
              </div>
              <div className="mt-2 font-display text-[19px] text-ink-900">Statement of need</div>
              <p className="mt-2 font-display text-[13.5px] leading-relaxed text-ink-600">
                In Thatta district, fewer than one in three girls who finish primary school enrol in
                secondary school. The nearest government school is more than five kilometres from 11
                of the 14 villages the Trust serves…
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-dark">
                  <div className="h-full w-[78%] rounded-full bg-accent-500" />
                </div>
                <span className="tabular font-mono text-[11px] text-ink-400">312 / 400 words</span>
              </div>
            </div>

            <div className="absolute -right-6 -bottom-16 flex rotate-[2deg] items-center gap-3 rounded-lg bg-surface px-3.5 py-2.5 text-ink-800 shadow-[0_18px_40px_-16px_rgb(0_0_0/0.55)]">
              <span className="flex size-8 items-center justify-center rounded-md bg-brass-soft text-[#7a5a1f]">
                <CalendarClock className="size-4" strokeWidth={1.8} />
              </span>
              <span>
                <span className="block text-[12.5px] font-medium text-ink-900">
                  Full proposal due
                </span>
                <span className="block text-[11.5px] text-flag-amber">
                  in 5 days · reminder sent
                </span>
              </span>
            </div>
          </div>
        </div>

        <p className="relative font-mono text-[11px] tracking-[0.08em] text-white/35 uppercase">
          For nonprofits, startups and grant writers
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-[380px]">
          <div className="mb-10 lg:hidden">
            <Wordmark />
          </div>
          <h1 className="font-display text-[32px] leading-tight tracking-[-0.01em] text-ink-900">
            {title}
          </h1>
          <p className="mt-1.5 text-ink-600">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 border-t border-line pt-5 text-[13.5px] text-ink-600">{footer}</div>
        </div>
      </section>
    </div>
  );
}
