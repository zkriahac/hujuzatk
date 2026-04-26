import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format, isSameDay, startOfToday, differenceInDays, differenceInCalendarMonths, parseISO } from 'date-fns';
import { Minus, Plus, ArrowUp, ArrowDown, CircleNotch, CalendarCheck } from 'phosphor-react';
import { cn } from '../utils/cn';
import { t, type Language } from '../lib/i18n';
import { formatTz } from '../utils/formatTz';

// Room group color palettes — header bg/text and booking cell bg/border/text
export const ROOM_GROUP_PALETTES = [
  { header: 'bg-blue-100 text-blue-800',       booking: { bg: 'bg-blue-50',    border: 'border-blue-300',    text: 'text-blue-800'    } },
  { header: 'bg-emerald-100 text-emerald-800', booking: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-800' } },
  { header: 'bg-violet-100 text-violet-800',   booking: { bg: 'bg-violet-50',  border: 'border-violet-300',  text: 'text-violet-800'  } },
  { header: 'bg-rose-100 text-rose-800',       booking: { bg: 'bg-rose-50',    border: 'border-rose-300',    text: 'text-rose-800'    } },
  { header: 'bg-amber-100 text-amber-800',     booking: { bg: 'bg-amber-50',   border: 'border-amber-300',   text: 'text-amber-800'   } },
  { header: 'bg-cyan-100 text-cyan-800',       booking: { bg: 'bg-cyan-50',    border: 'border-cyan-300',    text: 'text-cyan-800'    } },
  { header: 'bg-fuchsia-100 text-fuchsia-800', booking: { bg: 'bg-fuchsia-50', border: 'border-fuchsia-300', text: 'text-fuchsia-800' } },
  { header: 'bg-lime-100 text-lime-800',       booking: { bg: 'bg-lime-50',    border: 'border-lime-300',    text: 'text-lime-800'    } },
];

// Visual overlay applied on top of the room-palette per booking status. Room hue still wins
// for normal upcoming/active bookings (empty overlay); other statuses get a distinguishing
// treatment so users can tell at a glance what's canceled / completed / a no-show.
export const STATUS_OVERLAY: Record<string, string> = {
  UPCOMING: '',
  ACTIVE: 'ring-2 ring-emerald-500 ring-inset',
  COMPLETED: 'opacity-60 saturate-50',
  CANCELED: 'opacity-50 line-through bg-red-50! border-red-300! text-red-700!',
  'NO-SHOW': 'bg-amber-100! border-amber-400! text-amber-800!',
};

// Build roomId → palette index map from the rooms list, grouped by room name prefix
export function buildRoomPaletteMap(rooms: any[]): Record<string, number> {
  const prefixOrder: string[] = [];
  const map: Record<string, number> = {};
  for (const r of rooms) {
    const prefix = r.name.match(/^[A-Za-z\u0600-\u06FF]+/)?.[0] || r.name[0] || 'R';
    if (!prefixOrder.includes(prefix)) prefixOrder.push(prefix);
    map[r.id] = prefixOrder.indexOf(prefix) % ROOM_GROUP_PALETTES.length;
  }
  return map;
}

interface CalendarViewProps {
  rooms: any[];
  bookings: any[];
  selectedDateStr: string;
  setSelectedDateStr: (d: string) => void;
  calendarDays: Date[];
  calendarContainerRef: React.RefObject<HTMLDivElement | null>;
  setShowAddModal: (v: boolean) => void;
  setAddModalInitialDate: (d: string) => void;
  setAddModalInitialRoom: (r: string) => void;
  setSelectedBooking: (b: any) => void;
  setModalAnchor?: (a: { x: number; y: number } | null) => void;
  selectedBookingId?: string | null;
  showAddModal?: boolean;
  addModalInitialDate?: string;
  addModalInitialRoom?: string;
  jumpToToday: () => void;
  onLoadMorePast: () => Promise<void>;
  onLoadMoreFuture: () => Promise<void>;
  lang: Language;
  tz: string;
}

export default function CalendarView({
  rooms,
  bookings,
  selectedDateStr,
  setSelectedDateStr,
  calendarDays,
  calendarContainerRef,
  setShowAddModal,
  setAddModalInitialDate,
  setAddModalInitialRoom,
  setSelectedBooking,
  setModalAnchor,
  selectedBookingId,
  showAddModal,
  addModalInitialDate,
  addModalInitialRoom,
  jumpToToday,
  onLoadMorePast,
  onLoadMoreFuture,
  lang,
  tz,
}: CalendarViewProps) {
  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem('calendar-zoom');
    const n = saved ? parseInt(saved) : 1;
    return n >= 1 && n <= 3 ? n : 1;
  });
  const [hoveredBookingId, setHoveredBookingId] = useState<string | null>(null);
  // Whether the calendar is scrolled ≥ 2 months away from today. Drives the "jump to today" icon.
  const [farFromToday, setFarFromToday] = useState(false);

  useEffect(() => {
    const el = calendarContainerRef.current;
    if (!el) return;
    let raf: number | null = null;
    const compute = () => {
      raf = null;
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      // Find the row that owns the center pixel and read its data-date.
      const node = document.elementFromPoint(centerX, centerY);
      const tr = node?.closest?.('tr[data-date]') as HTMLElement | null;
      const dateStr = tr?.dataset.date;
      if (!dateStr) return;
      const months = Math.abs(differenceInCalendarMonths(parseISO(dateStr), new Date()));
      setFarFromToday(months >= 2);
    };
    const onScroll = () => {
      if (raf !== null) return;
      raf = requestAnimationFrame(compute);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    // Initial check after first paint
    raf = requestAnimationFrame(compute);
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [calendarContainerRef]);
  const [loadingPast, setLoadingPast] = useState(false);
  const [loadingFuture, setLoadingFuture] = useState(false);

  const handleLoadPast = useCallback(async () => {
    if (loadingPast) return;
    setLoadingPast(true);
    await onLoadMorePast();
    setLoadingPast(false);
  }, [loadingPast, onLoadMorePast]);

  const handleLoadFuture = useCallback(async () => {
    if (loadingFuture) return;
    setLoadingFuture(true);
    await onLoadMoreFuture();
    setLoadingFuture(false);
  }, [loadingFuture, onLoadMoreFuture]);

  const setZoomAndSave = (fn: (z: number) => number) => {
    setZoom(prev => {
      const next = fn(prev);
      localStorage.setItem('calendar-zoom', String(next));
      return next;
    });
  };

  // Zoom controls column width — smaller on mobile, larger on desktop
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const colW = isMobile ? [48, 80, 130][zoom - 1] : [100, 160, 240][zoom - 1];
  const rowH = isMobile ? 28 : 36;
  const bookingText = isMobile ? 'text-[10px]' : 'text-xs';
  const roomPaletteMap = useMemo(() => buildRoomPaletteMap(rooms), [rooms]);
  const isRtl = lang === 'ar';

  return (
    <div className="relative h-full">
      <div className="bg-white sm:rounded-3xl sm:border sm:border-slate-200 sm:shadow-xl overflow-hidden flex flex-col h-full">
        <div className="overflow-auto flex-1 scrollbar-hide" ref={calendarContainerRef}>
          <table className="border-separate border-spacing-0">
            <thead className="sticky top-0 z-40 bg-slate-50">
              <tr>
                <th className={cn('w-10 sm:w-24 p-0 border-b border-slate-200 sticky z-50 bg-slate-50', isRtl ? 'right-0 border-l' : 'left-0 border-r')}>
                  <button
                    type="button"
                    onClick={jumpToToday}
                    title={t(lang, 'calendar.jumpToday')}
                    aria-label={t(lang, 'calendar.jumpToday')}
                    className="w-full h-full py-2 sm:py-3 flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 active:scale-95 transition-all"
                  >
                    <CalendarCheck size={16} weight="bold" className="sm:hidden" />
                    <CalendarCheck size={18} weight="bold" className="hidden sm:block" />
                  </button>
                </th>
                {rooms.map((r: any) => (
                  <th
                    key={r.id}
                    style={{ width: colW, minWidth: colW }}
                    className={cn(
                      'p-1 sm:p-3 border-b border-r border-slate-200 text-[10px] sm:text-xs font-black uppercase tracking-widest text-center whitespace-nowrap',
                      ROOM_GROUP_PALETTES[roomPaletteMap[r.id] ?? 0].header,
                    )}
                  >
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td colSpan={rooms.length + 1} className="p-0">
                  <button
                    onClick={handleLoadPast}
                    disabled={loadingPast}
                    className="w-full py-2 sm:py-3 flex items-center justify-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
                  >
                    {loadingPast ? <CircleNotch size={14} weight="bold" className="animate-spin" /> : <ArrowUp size={14} weight="bold" />}
                    {loadingPast ? '...' : t(lang, 'calendar.loadPast')}
                  </button>
                </td>
              </tr>
              {calendarDays.map((date: Date) => {
                const dStr = format(date, 'yyyy-MM-dd');
                const isToday = isSameDay(date, new Date());
                const isPast = date < startOfToday();
                const isFirst = date.getDate() === 1;

                const isFirstOfYear = isFirst && date.getMonth() === 0;
                return (
                  <React.Fragment key={dStr}>
                    {isFirst && (
                      <tr aria-hidden="true">
                        <td
                          colSpan={rooms.length + 1}
                          className={cn(
                            'p-0 border-t-2 border-slate-900',
                            // Year boundary → tiny label strip. Month-only boundary → just the bold line.
                            isFirstOfYear ? 'bg-slate-50' : 'h-0 leading-[0]',
                          )}
                        >
                          {isFirstOfYear && (
                            <div className={cn('text-slate-700 text-[10px] sm:text-xs font-black tracking-[0.3em] px-2 sm:px-4 py-0.5', isRtl ? 'text-right' : 'text-left')}>
                              {date.getFullYear()}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                    <tr style={{ height: rowH }} className="group" data-today={isToday ? 'true' : 'false'} data-date={dStr}>
                      <td
                        onClick={() => setSelectedDateStr(dStr)}
                        className={cn(
                          'w-10 sm:w-24 border-slate-200 text-center text-[10px] sm:text-[12px] font-black cursor-pointer sticky z-30 transition-colors p-0 sm:p-2 whitespace-nowrap',
                          isRtl ? 'right-0 border-l' : 'left-0 border-r',
                          isToday
                            ? 'bg-emerald-600 text-white shadow-xl scale-105 z-40'
                            : isPast
                            ? 'bg-red-50 text-red-400'
                            : 'bg-white text-slate-500 hover:bg-slate-100/30',
                          selectedDateStr === dStr && !isToday && 'bg-emerald-50 text-emerald-600 border-l-4 border-l-emerald-600',
                        )}
                      >
                        <span className="sm:hidden">{format(date, 'dd')}<span className="text-[6px] block leading-none">{formatTz(date, 'MMM', tz, lang)}</span></span>
                        <span className="hidden sm:inline">{formatTz(date, 'dd MMM', tz, lang)}</span>
                      </td>
                      {rooms.map((r: any) => {
                        const cellBookings = bookings.filter((b: any) => {
                          // Show canceled too — just visually faded
                          const inRoom = b.room === r.id;
                          const checkInStr = b.checkIn.split('T')[0];
                          const checkOutStr = b.checkOut.split('T')[0];
                          return inRoom && dStr >= checkInStr && dStr < checkOutStr;
                        });
                        const hasBookings = cellBookings.length > 0;
                        const isPendingAdd = !!showAddModal && addModalInitialDate === dStr && addModalInitialRoom === r.id && !hasBookings;
                        return (
                          <td
                            key={r.id}
                            style={{ width: colW, minWidth: colW }}
                            onClick={(e) => {
                              setModalAnchor?.({ x: e.clientX, y: e.clientY });
                              setSelectedDateStr(dStr);
                              setAddModalInitialDate(dStr);
                              setAddModalInitialRoom(r.id);
                              setShowAddModal(true);
                            }}
                            className={cn(
                              'border border-slate-100 relative p-0 transition-all cursor-pointer',
                              // Cell hover only when empty — when a booking sits here, the bar itself carries the hover feedback
                              !hasBookings && 'hover:bg-emerald-100/80',
                              selectedDateStr === dStr && !hasBookings && 'bg-emerald-50/30',
                              // Visible confirmation that this is the cell the Add modal is acting on
                              isPendingAdd && 'bg-emerald-100 ring-2 ring-emerald-500 ring-inset z-20',
                            )}
                          >
                            {!hasBookings && (
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <Plus size={12} weight="bold" className="text-emerald-600" />
                              </div>
                            )}
                            {cellBookings.map((b: any) => {
                              const palette = ROOM_GROUP_PALETTES[roomPaletteMap[b.room] ?? 0].booking;
                              const statusOverlay = STATUS_OVERLAY[(b.status || '').toUpperCase()] || '';
                              const checkInStr = b.checkIn.split('T')[0];
                              const checkOutStr = b.checkOut.split('T')[0];
                              const isFirst = dStr === checkInStr;
                              // Last night = day right before checkout
                              const prevDay = new Date(dStr + 'T12:00:00');
                              prevDay.setDate(prevDay.getDate() + 1);
                              const nextDStr = format(prevDay, 'yyyy-MM-dd');
                              const isLast = nextDStr === checkOutStr;
                              const isSingle = isFirst && isLast;
                              // Show the guest name on the middle slice so it stays centered across the merged bar
                              const dayOffset = differenceInDays(parseISO(dStr), parseISO(checkInStr));
                              const totalNights = Math.max(1, differenceInDays(parseISO(checkOutStr), parseISO(checkInStr)));
                              const middleIdx = Math.floor((totalNights - 1) / 2);
                              const isMiddle = dayOffset === middleIdx;
                              const isSelected = selectedBookingId === b.id;
                              const isHovered = hoveredBookingId === b.id;
                              return (
                                <div
                                  key={b.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModalAnchor?.({ x: e.clientX, y: e.clientY });
                                    setSelectedBooking(b);
                                  }}
                                  onMouseEnter={() => setHoveredBookingId(b.id)}
                                  onMouseLeave={() => setHoveredBookingId((cur) => (cur === b.id ? null : cur))}
                                  className={cn(
                                    'absolute left-0.5 right-0.5 font-black text-center leading-tight flex items-center justify-center shadow-sm cursor-pointer transition-all px-0.5 border truncate',
                                    bookingText,
                                    palette.bg,
                                    palette.border,
                                    palette.text,
                                    // Merge visual: round only outer edges, strip interior borders so slices look continuous
                                    isSingle
                                      ? 'inset-y-0.5 rounded-md'
                                      : isFirst
                                      ? 'top-0.5 -bottom-px rounded-t-md rounded-b-none border-b-0'
                                      : isLast
                                      ? '-top-px bottom-0.5 rounded-b-md rounded-t-none border-t-0'
                                      : '-top-px -bottom-px rounded-none border-y-0',
                                    // Status-aware overlay (canceled, completed, no-show)
                                    statusOverlay,
                                    // Unified emphasis across every slice of the same booking (state-driven, not per-slice :hover)
                                    (isHovered || isSelected) && 'shadow-lg z-10',
                                    isSelected && 'ring-2 ring-emerald-500 ring-inset',
                                  )}
                                  title={`${b.bookingNumber ? '#' + String(b.bookingNumber).padStart(4, '0') + ' • ' : ''}${b.guestName}`}
                                >
                                  {/* Guest name on the middle slice; booking # appended on first slice when zoom permits */}
                                  <span className="truncate">
                                    {isFirst && b.bookingNumber && zoom >= 2 && (
                                      <span className="opacity-60 me-1">#{b.bookingNumber}</span>
                                    )}
                                    {isMiddle ? b.guestName : ''}
                                  </span>
                                </div>
                              );
                            })}
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                );
              })}
              <tr>
                <td colSpan={rooms.length + 1} className="p-0">
                  <button
                    onClick={handleLoadFuture}
                    disabled={loadingFuture}
                    className="w-full py-2 sm:py-3 flex items-center justify-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
                  >
                    {loadingFuture ? <CircleNotch size={14} weight="bold" className="animate-spin" /> : <ArrowDown size={14} weight="bold" />}
                    {loadingFuture ? '...' : t(lang, 'calendar.loadFuture')}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating zoom + (conditional) today cluster — small, low-opacity until hovered.
          The "today" icon only appears when the user has scrolled ≥ 2 months away from
          today, so on initial load the cluster is just the two zoom buttons. */}
      <div className={cn(
        'fixed bottom-4 z-50 flex items-center gap-1 bg-white/80 backdrop-blur rounded-full shadow-lg border border-slate-200 p-1 transition-opacity hover:opacity-100',
        farFromToday ? 'opacity-90' : 'opacity-30',
        isRtl ? 'left-4' : 'right-4',
      )}>
        <button
          onClick={() => setZoomAndSave(z => Math.max(1, z - 1))}
          disabled={zoom === 1}
          aria-label="Zoom out"
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-all"
        >
          <Minus size={14} weight="bold" />
        </button>
        <button
          onClick={() => setZoomAndSave(z => Math.min(3, z + 1))}
          disabled={zoom === 3}
          aria-label="Zoom in"
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-all"
        >
          <Plus size={14} weight="bold" />
        </button>
        {farFromToday && (
          <button
            onClick={jumpToToday}
            aria-label={t(lang, 'calendar.jumpToday')}
            title={t(lang, 'calendar.jumpToday')}
            className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-all"
          >
            <CalendarCheck size={16} weight="bold" />
          </button>
        )}
      </div>
    </div>
  );
}
