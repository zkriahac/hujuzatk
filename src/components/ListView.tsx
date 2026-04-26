import { parseISO, isSameDay, startOfToday } from 'date-fns';
import { MagnifyingGlass, Users, Eye } from 'phosphor-react';
import { cn } from '../utils/cn';
import { t, type Language } from '../lib/i18n';
import { formatTz } from '../utils/formatTz';
import { type ListFilter, getEffectiveStatus } from '../utils/constants';

interface ListViewProps {
  bookings: any[];
  fullFiltered: any[];
  visibleCount: number;
  totalCount: number;
  onLoadMore: () => void;
  listFilter: ListFilter;
  setListFilter: (f: ListFilter) => void;
  listSearchTerm: string;
  setListSearchTerm: (s: string) => void;
  setShowAddModal: (v: boolean) => void;
  setSelectedBooking: (b: any) => void;
  listContainerRef: React.RefObject<HTMLDivElement | null>;
  rooms: any[];
  currency: string;
  lang: Language;
  tz: string;
}

export default function ListView({
  bookings,
  fullFiltered,
  visibleCount,
  totalCount,
  onLoadMore,
  listFilter,
  setListFilter,
  listSearchTerm,
  setListSearchTerm,
  setShowAddModal,
  setSelectedBooking,
  listContainerRef,
  rooms,
  currency,
  lang,
  tz,
}: ListViewProps) {
  const roomNameMap = Object.fromEntries(rooms.map((r: any) => [r.id, r.name]));
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-6 items-center justify-between">
        <div className="flex gap-1 bg-slate-100 p-1.5 rounded-[1.25rem] w-full lg:w-auto overflow-x-auto">
          {(['today_checkin', 'today_checkout', 'active', 'past', 'canceled', 'all'] as ListFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setListFilter(f)}
              className={cn(
                'flex-none px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap',
                listFilter === f ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600',
              )}
            >
              {t(lang, `list.${f}`)}
            </button>
          ))}
        </div>
        <div className="flex gap-3 w-full lg:w-auto lg:flex-1 lg:justify-end">
          <div className="relative flex-1 lg:max-w-xs">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-300">
              <MagnifyingGlass size={18} />
            </div>
            <input
              type="text"
              placeholder={t(lang, 'list.search')}
              className="w-full bg-slate-50 border-slate-100 rounded-2xl pl-11 pr-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
              value={listSearchTerm}
              onChange={(e) => setListSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-600 text-white px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest whitespace-nowrap shadow-lg shadow-emerald-50 active:scale-95 transition-all"
          >
            {t(lang, 'list.new')}
          </button>
        </div>
      </div>

      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden overflow-x-auto max-h-[75vh] scrollbar-hide"
        ref={listContainerRef}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
              <th className="px-4 py-3 text-start">{t(lang, 'list.guest')}</th>
              <th className="px-4 py-3 text-start w-16">{t(lang, 'list.room')}</th>
              <th className="px-4 py-3 text-start min-w-40">{t(lang, 'list.dates')}</th>
              <th className="px-4 py-3 text-end">{t(lang, 'list.amount')}</th>
              <th className="px-4 py-3 text-end">{t(lang, 'list.balance')}</th>
              <th className="px-4 py-3 text-center">{t(lang, 'list.status')}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-4 text-slate-300">
                    <Users size={64} weight="light" />
                    <p className="font-bold uppercase text-[11px] tracking-[0.2em]">
                      {fullFiltered.length === 0 ? t(lang, 'misc.noBookings') : t(lang, 'misc.scrollMore')}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              bookings.map((b: any) => {
                const checkIn = parseISO(b.checkIn);
                const today = startOfToday();
                const effective = getEffectiveStatus(b);
                let statusColor = 'bg-slate-100 text-slate-500';
                let statusText = t(lang, 'list.upcoming');

                if (effective === 'CANCELED') {
                  statusColor = 'bg-red-50 text-red-500 line-through';
                  statusText = t(lang, 'list.canceled');
                } else if (effective === 'ACTIVE' && isSameDay(checkIn, today)) {
                  statusColor = 'bg-red-500 text-white font-black animate-pulse';
                  statusText = t(lang, 'list.checkInToday');
                } else if (effective === 'ACTIVE') {
                  statusColor = 'bg-emerald-600 text-white font-black';
                  statusText = t(lang, 'list.active');
                } else if (effective === 'COMPLETED' || effective === 'NO_SHOW') {
                  statusColor = 'bg-slate-200 text-slate-400';
                  statusText = effective === 'NO_SHOW' ? 'No Show' : t(lang, 'list.past');
                } else if (effective === 'UPCOMING') {
                  statusColor = 'bg-blue-100 text-blue-600';
                  statusText = t(lang, 'list.upcoming');
                }

                return (
                  <tr
                    key={b.id}
                    className={cn('group hover:bg-slate-50 transition-colors', b.status === 'CANCELED' && 'opacity-60')}
                  >
                    <td className="px-4 py-3">
                      <div className="font-black text-slate-900 text-sm leading-tight flex items-center gap-1.5">
                        {b.bookingNumber != null && (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-mono font-black tabular-nums shrink-0">
                            #{String(b.bookingNumber).padStart(4, '0')}
                          </span>
                        )}
                        {b.guestName}
                        {b.source && <span className="px-1.5 py-0.5 bg-violet-50 text-violet-500 rounded text-[9px] font-black uppercase tracking-tight shrink-0">{b.source}</span>}
                      </div>
                      <div className="text-xs font-bold text-slate-400 mt-0.5 tracking-tight uppercase">{b.guestPhone}</div>
                    </td>
                    <td className="px-4 py-3 font-black text-slate-900 text-sm">{roomNameMap[b.room] || b.room}</td>
                    <td className="px-4 py-3">
                      <div className="font-black text-slate-700 text-xs uppercase tracking-tighter">{formatTz(b.checkIn, 'dd MMM yyyy', tz, lang)}</div>
                      <div className="text-[11px] font-black text-slate-500 uppercase tracking-tighter">
                        {b.nights} {t(lang, 'list.nights')} · {formatTz(b.checkOut, 'dd MMM', tz, lang)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-end font-black text-slate-900 text-sm">
                      {currency} {b.totalPrice}
                    </td>
                    <td className={cn('px-4 py-3 text-end font-black text-sm', b.remaining > 0 ? 'text-red-500' : 'text-emerald-600')}>
                      {currency} {b.remaining}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('inline-block px-3 py-1 rounded-[10px] text-[10px] font-black uppercase tracking-wider whitespace-nowrap', statusColor)}>{statusText}</span>
                    </td>
                    <td className="px-4 py-3 text-end">
                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="h-10 w-10 flex items-center justify-center rounded-xl text-emerald-600 hover:bg-emerald-50 transition-all"
                        title={t(lang, 'list.view')}
                      >
                        <Eye size={20} weight="bold" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {visibleCount < totalCount && totalCount > 0 && (
        <div className="flex justify-center pt-6">
          <button
            onClick={onLoadMore}
            className="bg-emerald-600 text-white px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-emerald-50 hover:bg-emerald-700 transition-all active:scale-95"
          >
            Load {Math.min(50, totalCount - visibleCount)} more of {totalCount}
          </button>
        </div>
      )}
    </div>
  );
}
