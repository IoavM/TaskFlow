/**
 * Utility functions for local-aware date parsing in TaskFlow.
 * Tasks in TaskFlow represent wall-clock calendar times (e.g. 23:59 local).
 * Standard JavaScript `new Date("...Z")` interprets timestamps in UTC and shifts
 * them by the browser's local timezone offset (e.g. 23:59 UTC becomes 18:59 in UTC-5).
 * parseDateLocal extracts the literal calendar date and time without timezone skew.
 */

export const parseDateLocal = (iso?: string | null): Date => {
  if (!iso) return new Date();

  // Normalize spaces to T
  const normalized = iso.trim().replace(' ', 'T');
  const [datePart, rawTimePart] = normalized.split('T');

  if (!datePart) return new Date(iso);

  const [yearStr, monthStr, dayStr] = datePart.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return new Date(iso);
  }

  // Strip trailing Z, +HH:MM, or -HH:MM timezone identifiers from timePart
  let cleanTime = rawTimePart || '00:00:00';
  cleanTime = cleanTime.replace('Z', '').split('+')[0];
  // If there is a trailing timezone like -05:00, isolate the HH:MM(:SS)
  if (cleanTime.includes('-')) {
    cleanTime = cleanTime.split('-')[0];
  }

  const timeSegments = cleanTime.split(':');
  const hours = parseInt(timeSegments[0] || '0', 10);
  const minutes = parseInt(timeSegments[1] || '0', 10);
  const seconds = parseInt(timeSegments[2] || '0', 10);

  return new Date(
    year,
    month - 1,
    day,
    isNaN(hours) ? 0 : hours,
    isNaN(minutes) ? 0 : minutes,
    isNaN(seconds) ? 0 : seconds
  );
};

export const isSameDay = (d1: Date, d2: Date): boolean =>
  d1.getDate() === d2.getDate() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getFullYear() === d2.getFullYear();
