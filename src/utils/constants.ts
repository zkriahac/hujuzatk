export const DEFAULT_ROOMS = [
  { id: 'A1', name: 'A1' },
  { id: 'A2', name: 'A2' },
  { id: 'A3', name: 'A3' },
  { id: 'A4', name: 'A4' },
  { id: 'A5', name: 'A5' },
];

export type View = 'calendar' | 'list' | 'reports' | 'integrations' | 'settings' | 'admin' | 'expenses';
export type ListFilter = 'active' | 'past' | 'canceled' | 'today_checkin' | 'today_checkout' | 'all';
export type AuthMode = 'login' | 'register';

/** Compute effective booking status from DB status + real dates */
export function getEffectiveStatus(b: { status: string; checkIn: string; checkOut: string }): string {
  const status = (b.status || '').toUpperCase();
  if (status === 'CANCELED' || status === 'COMPLETED' || status === 'NO_SHOW') return status;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // midnight local
  const checkIn = new Date(b.checkIn);
  const checkOut = new Date(b.checkOut);
  if (checkOut <= today) return 'COMPLETED';
  if (checkIn <= today && checkOut > today) return 'ACTIVE';
  return 'UPCOMING';
}

export function getMonthNumber(monthName: string): string {
  const months: Record<string, string> = {
    JANUARY: '01', FEBRUARY: '02', MARCH: '03', APRIL: '04',
    MAY: '05', JUNE: '06', JULY: '07', AUGUST: '08',
    SEPTEMBER: '09', OCTOBER: '10', NOVEMBER: '11', DECEMBER: '12',
  };
  return months[monthName.toUpperCase()] || '01';
}
