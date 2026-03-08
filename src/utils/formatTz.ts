import { parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { ar, enUS } from 'date-fns/locale';
import type { Language } from '../lib/i18n';

export function formatTz(date: Date | string, fmt: string, tz: string, lang: Language): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(d, tz || 'Asia/Muscat', fmt, { locale: lang === 'ar' ? ar : enUS });
}
