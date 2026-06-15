import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import type { Language } from '../lib/i18n';

/**
 * Format a date string, extracting only the date part (YYYY-MM-DD).
 * No timezone conversion — just the date as stored.
 * 
 * Since backend stores all dates as UTC midnight (00:00:00),
 * we can safely extract the first 10 characters for the date.
 */
export function formatDateOnly(date: string | Date, fmt: string, lang: Language): string {
  let dateStr: string;
  
  if (typeof date === 'string') {
    // Take first 10 characters: "YYYY-MM-DD"
    dateStr = date.slice(0, 10);
  } else {
    // For Date objects, convert to ISO and take first 10 chars
    dateStr = date.toISOString().slice(0, 10);
  }
  
  // Parse as LOCAL midnight (no trailing 'Z') so date-fns `format` — which renders
  // in the host timezone — always prints the same calendar date we stored. Parsing
  // as UTC midnight would shift the date back a day for negative-UTC viewers.
  const d = new Date(dateStr + 'T00:00:00');
  return format(d, fmt, { locale: lang === 'ar' ? ar : enUS });
}