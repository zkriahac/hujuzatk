import { format, parseISO } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import type { Language } from '../lib/i18n';

export function formatDateOnly(date: string | Date, fmt: string, lang: Language): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, fmt, { locale: lang === 'ar' ? ar : enUS });
}