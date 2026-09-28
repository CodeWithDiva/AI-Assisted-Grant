import { describe, expect, it } from 'vitest';
import { calendarDaysUntil } from './days.util';

describe('calendarDaysUntil', () => {
  const due = new Date('2026-09-20T12:00:00Z');

  it('counts calendar days, whatever the time of day', () => {
    expect(calendarDaysUntil(due, new Date('2026-09-17T00:30:00Z'))).toBe(3);
    expect(calendarDaysUntil(due, new Date('2026-09-17T23:30:00Z'))).toBe(3);
  });

  it('is zero on the day itself, before and after the due time', () => {
    expect(calendarDaysUntil(due, new Date('2026-09-20T06:00:00Z'))).toBe(0);
    expect(calendarDaysUntil(due, new Date('2026-09-20T18:00:00Z'))).toBe(0);
  });

  it('is negative once the date has passed', () => {
    expect(calendarDaysUntil(due, new Date('2026-09-22T09:00:00Z'))).toBe(-2);
  });

  it('crosses month and year boundaries', () => {
    expect(
      calendarDaysUntil(new Date('2027-01-02T12:00:00Z'), new Date('2026-12-30T08:00:00Z')),
    ).toBe(3);
  });
});
