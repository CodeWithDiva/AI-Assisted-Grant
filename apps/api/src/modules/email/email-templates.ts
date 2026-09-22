/**
 * Transactional email templates. Email clients ignore stylesheets and most modern CSS,
 * so the markup is table-based with inline styles. Every value that came from a user
 * (organization names, titles) goes through escapeHtml.
 */

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

const COLORS = {
  paper: '#f7f5f0',
  night: '#11261f',
  ink: '#15171b',
  muted: '#545963',
  faint: '#858b95',
  line: '#e6e0d4',
  accent: '#1a6b50',
  amber: '#8f5e00',
  red: '#a3243a',
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout(options: { preheader: string; body: string; footer: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GrantPilot</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.paper};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(options.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.paper};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr>
          <td style="background:${COLORS.night};border-radius:10px 10px 0 0;padding:18px 28px;">
            <span style="display:inline-block;width:10px;height:10px;background:#ffffff;transform:rotate(45deg);margin-right:10px;vertical-align:middle;"></span>
            <span style="font-family:Georgia,'Times New Roman',serif;font-size:19px;color:#ffffff;vertical-align:middle;">GrantPilot</span>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border:1px solid ${COLORS.line};border-top:0;border-radius:0 0 10px 10px;padding:30px 28px;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${COLORS.ink};">
            ${options.body}
          </td>
        </tr>
        <tr>
          <td style="padding:18px 8px;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:${COLORS.faint};text-align:center;">
            ${options.footer}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function eyebrow(text: string, color = COLORS.faint): string {
  return `<div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${color};">${escapeHtml(text)}</div>`;
}

function title(text: string): string {
  return `<h1 style="margin:8px 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:25px;font-weight:normal;line-height:1.25;color:${COLORS.ink};">${escapeHtml(text)}</h1>`;
}

function details(rows: [string, string][]): string {
  const cells = rows
    .map(
      ([label, value]) => `<tr>
        <td style="padding:8px 0;border-top:1px solid ${COLORS.line};font-size:13px;color:${COLORS.faint};width:120px;vertical-align:top;">${escapeHtml(label)}</td>
        <td style="padding:8px 0;border-top:1px solid ${COLORS.line};font-size:14px;color:${COLORS.ink};">${escapeHtml(value)}</td>
      </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 22px;border-bottom:1px solid ${COLORS.line};">${cells}</table>`;
}

function button(label: string, href: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:${COLORS.accent};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:6px;">${escapeHtml(label)}</a>`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function deadlineReminderEmail(input: {
  organizationName: string;
  deadlineTitle: string;
  proposalTitle: string | null;
  dueAt: Date;
  timezone: string;
  daysRemaining: number;
  appUrl: string;
}): RenderedEmail {
  const when =
    input.daysRemaining < 0
      ? `${Math.abs(input.daysRemaining)} day${Math.abs(input.daysRemaining) === 1 ? '' : 's'} overdue`
      : input.daysRemaining === 0
        ? 'due today'
        : `due in ${input.daysRemaining} day${input.daysRemaining === 1 ? '' : 's'}`;

  const urgencyColor =
    input.daysRemaining < 0 ? COLORS.red : input.daysRemaining <= 3 ? COLORS.amber : COLORS.accent;

  const subject = `${input.deadlineTitle} — ${when}`;
  const dueLabel = `${formatDate(input.dueAt)} (${input.timezone})`;
  const link = `${input.appUrl}/deadlines`;

  const rows: [string, string][] = [
    ['Organization', input.organizationName],
    ...(input.proposalTitle ? ([['Proposal', input.proposalTitle]] as [string, string][]) : []),
    ['Due', dueLabel],
  ];

  const html = layout({
    preheader: `${input.organizationName}: ${subject}`,
    body: `${eyebrow(`Deadline ${when}`, urgencyColor)}
      ${title(input.deadlineTitle)}
      <p style="margin:0;color:${COLORS.muted};">A reminder so this does not slip. Check the draft, clear any remaining placeholders, and submit before the date below.</p>
      ${details(rows)}
      ${button('Open deadlines', link)}`,
    footer: `You receive deadline reminders as an owner or editor of ${escapeHtml(input.organizationName)}.<br>Reminders go out 14, 7, 3 and 1 day before each date.`,
  });

  const text = [
    `${input.deadlineTitle} — ${when}`,
    '',
    `Organization: ${input.organizationName}`,
    input.proposalTitle ? `Proposal: ${input.proposalTitle}` : null,
    `Due: ${dueLabel}`,
    '',
    `Open deadlines: ${link}`,
  ]
    .filter((line) => line !== null)
    .join('\n');

  return { subject, text, html };
}

export function passwordResetEmail(input: {
  name: string;
  link: string;
  expiresInMinutes: number;
}): RenderedEmail {
  const subject = 'Reset your GrantPilot password';

  const html = layout({
    preheader: 'A link to choose a new password',
    body: `${eyebrow('Password reset')}
      ${title('Choose a new password')}
      <p style="margin:0 0 22px;color:${COLORS.muted};">Hello ${escapeHtml(input.name)}, someone (hopefully you) asked to reset the password for your GrantPilot account.</p>
      ${button('Choose a new password', input.link)}
      <p style="margin:22px 0 0;font-size:13px;color:${COLORS.faint};">The link works once and expires in ${input.expiresInMinutes} minutes. Choosing a new password signs you out on every device. If the button does not work, paste this address into your browser:<br><span style="color:${COLORS.muted};word-break:break-all;">${escapeHtml(input.link)}</span></p>`,
    footer: 'If you did not ask for this, ignore this email — your password stays the same.',
  });

  const text = [
    `Hello ${input.name},`,
    '',
    'Someone (hopefully you) asked to reset the password for your GrantPilot account.',
    `Choose a new password: ${input.link}`,
    '',
    `The link works once and expires in ${input.expiresInMinutes} minutes.`,
    'If you did not ask for this, ignore this email — your password stays the same.',
  ].join('\n');

  return { subject, text, html };
}

/** Sent to the old address, so a hijacked account does not change hands silently. */
export function emailChangedEmail(input: { name: string; newEmail: string }): RenderedEmail {
  const subject = 'Your GrantPilot email address was changed';

  const html = layout({
    preheader: `Your account now uses ${input.newEmail}`,
    body: `${eyebrow('Account')}
      ${title('Email address changed')}
      <p style="margin:0;color:${COLORS.muted};">Hello ${escapeHtml(input.name)}, your GrantPilot account now signs in with <strong style="color:${COLORS.ink};">${escapeHtml(input.newEmail)}</strong>. This address will no longer receive its emails.</p>`,
    footer:
      'If you did not make this change, reply to this email or contact your administrator straight away.',
  });

  const text = [
    `Hello ${input.name},`,
    '',
    `Your GrantPilot account now signs in with ${input.newEmail}. This address will no longer receive its emails.`,
    'If you did not make this change, contact your administrator straight away.',
  ].join('\n');

  return { subject, text, html };
}

export function invitationEmail(input: {
  organizationName: string;
  inviterName: string;
  role: string;
  link: string;
  expiresInDays: number;
}): RenderedEmail {
  const role = input.role.toLowerCase();
  const subject = `${input.inviterName} invited you to ${input.organizationName} on GrantPilot`;

  const html = layout({
    preheader: `Join ${input.organizationName} as ${role}`,
    body: `${eyebrow('Invitation')}
      ${title(`Join ${input.organizationName}`)}
      <p style="margin:0 0 22px;color:${COLORS.muted};">${escapeHtml(input.inviterName)} has invited you to work on ${escapeHtml(input.organizationName)}&rsquo;s grant proposals as <strong style="color:${COLORS.ink};">${escapeHtml(role)}</strong>.</p>
      ${button('Accept the invitation', input.link)}
      <p style="margin:22px 0 0;font-size:13px;color:${COLORS.faint};">The link works once and expires in ${input.expiresInDays} days. If the button does not work, paste this address into your browser:<br><span style="color:${COLORS.muted};word-break:break-all;">${escapeHtml(input.link)}</span></p>`,
    footer: 'If you were not expecting this invitation, you can ignore this email.',
  });

  const text = [
    `${input.inviterName} has invited you to join ${input.organizationName} as ${role}.`,
    '',
    `Accept the invitation: ${input.link}`,
    '',
    `The link works once and expires in ${input.expiresInDays} days.`,
  ].join('\n');

  return { subject, text, html };
}
