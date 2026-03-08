export const DEFAULT_ROOMS = [
  { id: 'A1', name: 'A1' },
  { id: 'A2', name: 'A2' },
  { id: 'A3', name: 'A3' },
  { id: 'A4', name: 'A4' },
  { id: 'A5', name: 'A5' },
];

export type View = 'calendar' | 'list' | 'reports' | 'settings' | 'admin';
export type ListFilter = 'upcoming' | 'active' | 'past' | 'canceled' | 'all';
export type AuthMode = 'login' | 'register';

export function getMonthNumber(monthName: string): string {
  const months: Record<string, string> = {
    JANUARY: '01', FEBRUARY: '02', MARCH: '03', APRIL: '04',
    MAY: '05', JUNE: '06', JULY: '07', AUGUST: '08',
    SEPTEMBER: '09', OCTOBER: '10', NOVEMBER: '11', DECEMBER: '12',
  };
  return months[monthName.toUpperCase()] || '01';
}
