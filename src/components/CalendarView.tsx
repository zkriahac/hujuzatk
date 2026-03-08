import React, { useMemo, useState } from 'react';
import { format, isSameDay, startOfToday } from 'date-fns';
import { Minus, Plus, Sparkle } from 'phosphor-react';
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

// Extract the alphabetic prefix of a room ID: "A1"→"A", "B102"→"B"
export function getRoomPrefix(roomId: string): string {
  return roomId.match(/^[A-Za-z]+/)?.[0] || roomId[0] || 'R';
}

// Build roomId → palette index map from the rooms list
export function buildRoomPaletteMap(rooms: any[]): Record<string, number> {
  const prefixOrder: string[] = [];
  const map: Record<string, number> = {};
  for (const r of rooms) {
    const prefix = getRoomPrefix(r.id);
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
  jumpToToday: () => void;
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
  jumpToToday,
  lang,
  tz,
}: CalendarViewProps) {
  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem('calendar-zoom');
    const n = saved ? parseInt(saved) : 1;
    return n >= 1 && n <= 3 ? n : 1;
  });

  const setZoomAndSave = (fn: (z: number) => number) => {
    setZoom(prev => {
      const next = fn(prev);
      localStorage.setItem('calendar-zoom', String(next));
      return next;
    });
  };

  const colW = [80, 140, 220][zoom - 1];
  const rowH = [32, 40, 52][zoom - 1];
  const bookingText = (['text-[10px]', 'text-[12px]', 'text-[15px]'] as const)[zoom - 1];
  const roomPaletteMap = useMemo(() => buildRoomPaletteMap(rooms), [rooms]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[75vh]">
        <div className="overflow-auto flex-1 scrollbar-hide" ref={calendarContainerRef}>
          <table className="border-separate border-spacing-0">
            <thead className="sticky top-0 z-40 bg-slate-50/90 backdrop-blur-md">
              <tr>
                <th className="w-16 sm:w-24 p-2 sm:p-4 border-b border-r border-slate-200 sticky left-0 z-50 bg-slate-50/90 backdrop-blur-md text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {t(lang, 'calendar.date')}
                </th>
                {rooms.map((r: any) => (
                  <th
                    key={r.id}
                    style={{ width: colW, minWidth: colW }}
                    className={cn(
                      'p-2 sm:p-4 border-b border-r border-slate-200 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-center',
                      ROOM_GROUP_PALETTES[roomPaletteMap[r.id] ?? 0].header,
                    )}
                  >
                    <span className="hidden sm:inline">{r.name}</span>
                    <span className="sm:hidden font-black">{r.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {calendarDays.map((date: Date) => {
                const dStr = format(date, 'yyyy-MM-dd');
                const isToday = isSameDay(date, new Date());
                const isPast = date < startOfToday();
                const isFirst = date.getDate() === 1;

                return (
                  <React.Fragment key={dStr}>
                    {isFirst && (
                      <tr>
                        <td
                          colSpan={rooms.length + 1}
                          className="bg-slate-900 text-white text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] px-2 sm:px-4 py-1.5 sm:py-2 sticky left-0 z-30"
                        >
                          {formatTz(date, 'MMMM yyyy', tz, lang).toUpperCase()}
                        </td>
                      </tr>
                    )}
                    <tr style={{ height: `${rowH}px` }} className="group" data-today={isToday ? 'true' : 'false'}>
                      <td
                        onClick={() => setSelectedDateStr(dStr)}
                        className={cn(
                          'border-r border-slate-200 text-center text-[9px] sm:text-[11px] font-black cursor-pointer sticky left-0 z-30 transition-colors p-1 sm:p-4',
                          isToday
                            ? 'bg-emerald-600 text-white shadow-xl scale-105 z-40'
                            : isPast
                            ? 'bg-red-50/40 text-red-400'
                            : 'bg-white text-slate-500 hover:bg-slate-100/30',
                          selectedDateStr === dStr && !isToday && 'bg-emerald-50 text-emerald-600 border-l-4 border-l-emerald-600',
                        )}
                      >
                        {formatTz(date, 'dd MMM', tz, lang)}
                      </td>
                      {rooms.map((r: any) => {
                        const cellBookings = bookings.filter((b: any) => {
                          if (b.status === 'CANCELED') return false;
                          const inRoom = b.room === r.id;
                          const checkInStr = b.checkIn.split('T')[0];
                          const checkOutStr = b.checkOut.split('T')[0];
                          return inRoom && dStr >= checkInStr && dStr < checkOutStr;
                        });
                        return (
                          <td
                            key={r.id}
                            style={{ width: colW, minWidth: colW }}
                            onClick={() => {
                              setSelectedDateStr(dStr);
                              setAddModalInitialDate(dStr);
                              setAddModalInitialRoom(r.id);
                              setShowAddModal(true);
                            }}
                            className={cn(
                              'border border-slate-100 relative p-0 transition-all cursor-pointer hover:bg-emerald-100/80',
                              selectedDateStr === dStr && 'bg-emerald-50/30',
                            )}
                          >
                            {cellBookings.length === 0 && (
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <Plus size={20} weight="bold" className="text-emerald-600" />
                              </div>
                            )}
                            {cellBookings.map((b: any) => {
                              const palette = ROOM_GROUP_PALETTES[roomPaletteMap[b.room] ?? 0].booking;
                              return (
                                <div
                                  key={b.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBooking(b);
                                  }}
                                  className={cn(
                                    'absolute inset-0.5 font-black rounded-md sm:rounded-lg text-center leading-tight flex items-center justify-center shadow-sm cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] px-1 sm:px-2 border truncate',
                                    bookingText,
                                    palette.bg,
                                    palette.border,
                                    palette.text,
                                  )}
                                  title={b.guestName}
                                >
                                  <span className="truncate">{b.guestName}</span>
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
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 bg-white p-3 sm:p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex gap-2 items-center">
          <button
            onClick={jumpToToday}
            className="text-xs bg-slate-900 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
          >
            {t(lang, 'calendar.jumpToday')}
          </button>
          <div className="flex items-center gap-0.5 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setZoomAndSave(z => Math.max(1, z - 1))}
              disabled={zoom === 1}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 disabled:opacity-30 transition-all"
            >
              <Minus size={13} weight="bold" />
            </button>
            <span className="text-[10px] font-black text-slate-500 w-4 text-center tabular-nums">{zoom}</span>
            <button
              onClick={() => setZoomAndSave(z => Math.min(3, z + 1))}
              disabled={zoom === 3}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 disabled:opacity-30 transition-all"
            >
              <Plus size={13} weight="bold" />
            </button>
          </div>
        </div>
        <button
          onClick={() => {
            setAddModalInitialDate(selectedDateStr);
            setShowAddModal(true);
          }}
          className="bg-emerald-600 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-50 transition-all flex items-center gap-2 active:scale-95 whitespace-nowrap"
        >
          <Sparkle size={16} weight="fill" />
          {t(lang, 'calendar.newBooking')}
        </button>
      </div>
    </div>
  );
}
