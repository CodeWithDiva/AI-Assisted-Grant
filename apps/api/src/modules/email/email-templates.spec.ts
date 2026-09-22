import { describe, expect, it } from 'vitest';
import { deadlineReminderEmail, escapeHtml, invitationEmail } from './email-templates';
import { parseSender } from './email.service';

describe('escapeHtml', () => {
  it('neutralises markup in user-provided values', () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'y'`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;',
    );
  });
});

describe('deadlineReminderEmail', () => {
  const base = {
    organizationName: 'Roshni <Education> Trust',
    deadlineTitle: 'Full proposal',
    proposalTitle: 'Keeping girls in school',
    dueAt: new Date('2026-09-21T12:00:00Z'),
    timezone: 'UTC',
    appUrl: 'https://app.example.org',
  };

  it('describes how far away the deadline is', () => {
    expect(deadlineReminderEmail({ ...base, daysRemaining: 5 }).subject).toBe(
      'Full proposal — due in 5 days',
    );
    expect(deadlineReminderEmail({ ...base, daysRemaining: 1 }).subject).toBe(
      'Full proposal — due in 1 day',
    );
    expect(deadlineReminderEmail({ ...base, daysRemaining: 0 }).subject).toBe(
      'Full proposal — due today',
    );
    expect(deadlineReminderEmail({ ...base, daysRemaining: -2 }).subject).toBe(
      'Full proposal — 2 days overdue',
    );
  });

  it('escapes user text in the HTML but keeps it readable in the plain-text part', () => {
    const email = deadlineReminderEmail({ ...base, daysRemaining: 5 });
    expect(email.html).toContain('Roshni &lt;Education&gt; Trust');
    expect(email.html).not.toContain('<Education>');
    expect(email.text).toContain('Organization: Roshni <Education> Trust');
  });

  it('links to the deadlines page and omits the proposal line when there is none', () => {
    const email = deadlineReminderEmail({ ...base, proposalTitle: null, daysRemaining: 3 });
    expect(email.html).toContain('href="https://app.example.org/deadlines"');
    expect(email.text).not.toContain('Proposal:');
  });
});

describe('invitationEmail', () => {
  it('includes the accept link in both parts', () => {
    const email = invitationEmail({
      organizationName: 'Roshni Education Trust',
      inviterName: 'Ayesha Malik',
      role: 'EDITOR',
      link: 'https://app.example.org/invite/abc',
      expiresInDays: 7,
    });
    expect(email.subject).toBe('Ayesha Malik invited you to Roshni Education Trust on GrantPilot');
    expect(email.html).toContain('href="https://app.example.org/invite/abc"');
    expect(email.text).toContain('Accept the invitation: https://app.example.org/invite/abc');
    expect(email.text).toContain('as editor');
  });
});

describe('parseSender', () => {
  it('splits a display name from the address', () => {
    expect(parseSender('GrantPilot <noreply@example.org>')).toEqual({
      name: 'GrantPilot',
      email: 'noreply@example.org',
    });
    expect(parseSender('"Roshni Trust" <a@b.org>')).toEqual({
      name: 'Roshni Trust',
      email: 'a@b.org',
    });
    expect(parseSender('plain@example.org')).toEqual({ email: 'plain@example.org' });
  });
});
