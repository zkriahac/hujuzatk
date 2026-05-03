import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format, isSameDay, startOfToday, differenceInDays, differenceInCalendarMonths, parseISO } from 'date-fns';
import { Minus, Plus, ArrowUp, ArrowDown, CircleNotch, CalendarCheck, ArrowsClockwise, CloudArrowDown, MagnifyingGlassMinus, MagnifyingGlassPlus } from 'phosphor-react';
import { cn } from '../utils/cn';
import { t, type Language } from '../lib/i18n';
import { formatTz } from '../utils/formatTz';
import CornerActionMenu, { type ActionItem } from './CornerActionMenu';

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
// treatment so users can tell at a glance what's canceled / a no-show.
// IMPORTANT: don't use `opacity-*` or filter classes (saturate, grayscale) on these
// slices — each slice is its own absolutely-positioned div, and opacity creates a
// stacking context. Two adjacent slices each with opacity 0.6 blend at the 1–2px
// overlap to ~0.84, producing a visible darker stripe at every cell boundary that
// looks like per-cell borders. Use explicit muted color overrides instead.
//
// COMPLETED has no override on purpose — past bookings render in their normal room
// palette, same as upcoming. The visual cue for "what's happening now" is a thicker
// border applied per-render to active + imminent (checkIn within 1 day) bookings.
export const STATUS_OVERLAY: Record<string, string> = {
  UPCOMING: '',
  ACTIVE: '',
  COMPLETED: '',
  CANCELED: 'line-through bg-red-50! border-red-300! text-red-700!',
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
  /** Local reload — re-fetches bookings from DB only. Fast (~500ms). */
  onRefresh?: () => Promise<void> | void;
  /** Channel sync — hits Airbnb/Gathern/Booking.com iCal feeds, then reloads. Slow (5–30s). */
  onSync?: () => Promise<void> | void;
  refreshing?: boolean;
  syncing?: boolean;
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
  onRefresh,
  onSync,
  refreshing,
  syncing,
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

  // Today / tomorrow date strings — used to highlight bookings that are currently
  // active (today is between checkIn and checkOut) or starting tomorrow.
  // Those slices get a thicker border so the user can spot what's happening right now.
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = format(tomorrowDate, 'yyyy-MM-dd');

  return (
    <div className="relative h-full">
      <div className="bg-white sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-xl overflow-hidden flex flex-col h-full">
        <div className="overflow-auto flex-1 scrollbar-hide" ref={calendarContainerRef}>
          <table className="border-separate border-spacing-0">
            <thead className="sticky top-0 z-40 bg-slate-50">
              <tr>
                <th
                  className={cn(
                    // min-w / max-w lock the cell to its design width — the table has
                    // table-layout: auto, and since every other column has rigid inline
                    // widths, any extra wrapper width otherwise spills into this corner.
                    'w-12 min-w-12 max-w-12 sm:w-24 sm:min-w-24 sm:max-w-24',
                    'p-0 border-b border-slate-200 sticky z-50 bg-slate-50',
                    isRtl ? 'right-0 border-l' : 'left-0 border-r',
                  )}
                  style={{ width: isMobile ? 48 : 96, minWidth: isMobile ? 48 : 96, maxWidth: isMobile ? 48 : 96 }}
                >
                  {/* The actual menu trigger lives outside the table (positioned absolutely
                      over this corner) so the fan-out items aren't clipped by the cell.
                      We leave this <th> as a sticky placeholder that anchors the corner. */}
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
                        {/* Bold month-boundary line is restricted to the date column only —
                            the room columns shouldn't be cut by a horizontal line because
                            it visually breaks multi-day booking bars that cross the month. */}
                        <td
                          className={cn(
                            'p-0 border-t-2 border-slate-900 sticky z-30',
                            isRtl ? 'right-0' : 'left-0',
                            isFirstOfYear ? 'bg-slate-50' : 'h-0 leading-[0]',
                          )}
                        >
                          {isFirstOfYear && (
                            <div className={cn('text-slate-700 text-[10px] sm:text-xs font-black tracking-[0.3em] px-2 sm:px-4 py-0.5', isRtl ? 'text-right' : 'text-left')}>
                              {date.getFullYear()}
                            </div>
                          )}
                        </td>
                        {/* Room columns get no border — bookings spanning the month boundary
                            stay visually continuous. For year boundaries we still tint the
                            strip slate-50 so the row reads as one band. */}
                        <td
                          colSpan={rooms.length}
                          className={cn('p-0', isFirstOfYear ? 'bg-slate-50' : 'h-0 leading-[0]')}
                        />
                      </tr>
                    )}
                    <tr style={{ height: rowH }} className="group" data-today={isToday ? 'true' : 'false'} data-date={dStr}>
                      <td
                        onClick={() => setSelectedDateStr(dStr)}
                        className={cn(
                          'w-12 sm:w-24 border-slate-200 text-center text-[10px] sm:text-[12px] font-black cursor-pointer sticky z-30 transition-colors p-0 sm:p-2 whitespace-nowrap',
                          isRtl ? 'right-0 border-l' : 'left-0 border-r',
                          isToday
                            ? 'bg-emerald-600 text-white shadow-xl scale-105 z-40'
                            : isPast
                            ? 'bg-red-50 text-red-400'
                            : 'bg-white text-slate-500 hover:bg-slate-100/30',
                          selectedDateStr === dStr && !isToday && 'bg-emerald-50 text-emerald-600 border-l-4 border-l-emerald-600',
                        )}
                      >
                        <span className="sm:hidden">{format(date, 'dd')}<span className="text-[9px] block leading-none">{formatTz(date, 'MMM', tz, lang)}</span></span>
                        <span className="hidden sm:inline">{formatTz(date, 'dd MMM', tz, lang)}</span>
                      </td>
                      {rooms.map((r: any) => {
                        const cellBookings = bookings
                          .filter((b: any) => {
                            // Show canceled too — just visually faded
                            const inRoom = b.room === r.id;
                            const checkInStr = b.checkIn.split('T')[0];
                            const checkOutStr = b.checkOut.split('T')[0];
                            return inRoom && dStr >= checkInStr && dStr < checkOutStr;
                          })
                          // Canceled/completed render first (lower z-index) so active bookings sit on top
                          .sort((a: any, b: any) => {
                            const zScore = (s: string) => {
                              const u = (s || '').toUpperCase();
                              if (u === 'CANCELED') return 0;
                              if (u === 'COMPLETED' || u === 'NO-SHOW' || u === 'NO_SHOW') return 1;
                              return 2;
                            };
                            return zScore(a.status) - zScore(b.status);
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
                              // Imminent = currently active OR checkIn is tomorrow.
                              // We compare strings so timezone shifts don't sneak in.
                              const isActiveNow = todayStr >= checkInStr && todayStr < checkOutStr;
                              const startsTomorrow = checkInStr === tomorrowStr;
                              const isImminent = (isActiveNow || startsTomorrow) && b.status?.toUpperCase() !== 'CANCELED';
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
                                    // Bold edge for "happening right now / starts tomorrow".
                                    // Goes through the same merge logic, so multi-day imminent
                                    // bookings get a thick continuous bar — not per-cell rings.
                                    isImminent && 'border-2',
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
                                  title={`${b.bookingNumber ? '#' + String(b.bookingNumber).padStart(4, '0') + ' • ' : ''}${b.guestName}${b.notes ? ' 📝' : ''}`}
                                >
                                  {/* Note corner fold — amber dog-ear in the top-right, visible on first/single slice */}
                                  {b.notes && (isFirst || isSingle) && (
                                    <span
                                      className="absolute top-0 right-0 pointer-events-none z-10"
                                      style={{ width: 9, height: 9, background: '#f59e0b', clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}
                                    />
                                  )}
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

      {/* Fan-out action menu — sized to match the corner cell exactly so the trigger
          flex-centers inside the cell at every breakpoint (28×56 mobile, 48×96 desktop).
          Items fan out into the calendar interior in a 90° arc. */}
      <div
        className={cn(
          'absolute z-[60] flex items-center justify-center',
          isRtl ? 'right-0 top-0' : 'left-0 top-0',
        )}
        // Inline width/height mirror the corner cell's LOCKED width above so the
        // trigger flex-centers exactly within the cell. We use inline values (not
        // w-* utilities) to dodge any breakpoint mismatch with the cell at zoom levels.
        style={{
          width: isMobile ? 48 : 96,
          height: isMobile ? 28 : 42,
        }}
      >
        <CornerActionMenu
          isRtl={isRtl}
          radius={isMobile ? 50 : 75}
          itemSize={isMobile ? 30 : 40}
          items={[
            {
              icon: <CloudArrowDown size={16} weight="bold" />,
              label: t(lang, 'calendar.syncTip'),
              onClick: async () => { if (onSync) await onSync(); jumpToToday(); },
              disabled: syncing || refreshing,
              spin: syncing,
              tone: 'emerald',
            },
            {
              icon: <ArrowsClockwise size={16} weight="bold" />,
              label: t(lang, 'calendar.refreshTip'),
              onClick: async () => { if (onRefresh) await onRefresh(); jumpToToday(); },
              disabled: refreshing || syncing,
              spin: refreshing,
            },
            {
              icon: <MagnifyingGlassPlus size={16} weight="bold" />,
              label: 'Zoom in',
              onClick: () => setZoomAndSave((z) => Math.min(3, z + 1)),
              disabled: zoom === 3,
            },
            {
              icon: <MagnifyingGlassMinus size={16} weight="bold" />,
              label: 'Zoom out',
              onClick: () => setZoomAndSave((z) => Math.max(1, z - 1)),
              disabled: zoom === 1,
            },
            {
              icon: <CalendarCheck size={16} weight="bold" />,
              label: t(lang, 'calendar.jumpToday'),
              onClick: jumpToToday,
              hidden: !farFromToday,
              tone: 'emerald',
            },
          ] satisfies ActionItem[]}
        />
      </div>
    </div>
  );
}
