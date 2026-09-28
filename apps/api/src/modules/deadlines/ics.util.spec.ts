import { describe, expect, it } from 'vitest';
import { buildIcs, escapeIcs, icsDate } from './ics.util';

describe('icsDate', () => {
  it('formats as UTC basic time', () => {
    expect(icsDate(new Date('2026-09-19T12:30:00.000Z'))).toBe('20260919T123000Z');
  });
});

describe('escapeIcs', () => {
  it('escapes the characters iCalendar treats as separators', () => {
    expect(escapeIcs('Grant, due; now\nplease')).toBe('Grant\\, due\\; now\\nplease');
  });
});

describe('buildIcs', () => {
  const ics = buildIcs(
    {
      id: 'deadline-1',
      title: 'Full proposal, final',
      description: 'Grant deadline',
      start: new Date('2026-09-19T12:00:00.000Z'),
    },
    new Date('2026-09-16T08:00:00.000Z'),
  );

  it('produces a complete calendar object', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR')).toBe(true);
    expect(ics).toContain('UID:deadline-1@grantpilot');
  });

  it('defaults the event to one hour', () => {
    expect(ics).toContain('DTSTART:20260919T120000Z');
    expect(ics).toContain('DTEND:20260919T130000Z');
  });

  it('escapes the summary', () => {
    expect(ics).toContain('SUMMARY:Full proposal\\, final');
  });
});
