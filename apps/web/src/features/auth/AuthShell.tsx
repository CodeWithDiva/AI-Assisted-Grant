import type { ReactNode } from 'react';
import { Wordmark } from '../../app/Wordmark';

/**
 * Sign-in and sign-up share one layout: an editorial panel on the left that says what the
 * product does, and the form on the right. The panel collapses away on small screens.
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
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-accent-900 px-12 py-12 text-white lg:flex">
        <Wordmark tone="light" />

        <div className="relative max-w-md">
          <p className="font-display text-[34px] leading-[1.2]">
            Funding applications, written in your own words — and never late.
          </p>
          <ul className="mt-8 space-y-4 text-[14.5px] text-white/75">
            {[
              'Drafts follow the funder’s own sections, word limits and scoring criteria.',
              'Every fact comes from your organization profile. Nothing is invented.',
              'Deadlines are tracked, with reminders two weeks out and again on the last day.',
            ].map((line) => (
              <li key={line} className="flex gap-3">
                <span className="mt-2 block size-1.5 shrink-0 rounded-full bg-accent-300" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <p className="font-mono text-[11px] tracking-wide text-white/40 uppercase">
          For nonprofits, startups and grant writers
        </p>

        {/* Faint ruled paper, drawn in CSS rather than shipped as an image. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to bottom, #ffffff 0 1px, transparent 1px 32px)',
          }}
        />
      </section>

      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden">
            <Wordmark />
          </div>
          <h1 className="mt-8 font-display text-[28px] leading-tight text-ink-900 lg:mt-0">
            {title}
          </h1>
          <p className="mt-1.5 text-ink-600">{subtitle}</p>
          <div className="mt-7">{children}</div>
          <div className="mt-6 text-[13.5px] text-ink-600">{footer}</div>
        </div>
      </section>
    </div>
  );
}
