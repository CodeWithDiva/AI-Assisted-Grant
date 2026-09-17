const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whole calendar days from today to the due date (negative when overdue).
 *
 * Counting elapsed hours and rounding up would call a deadline three calendar days away
 * "4 days left" whenever it is checked early in the day, so both dates are reduced to their
 * UTC calendar day first — deadlines are stored as a date at 12:00 UTC.
 */
export function calendarDaysUntil(due: Date, now: Date = new Date()): number {
  const dueDay = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((dueDay - today) / DAY_MS);
}
