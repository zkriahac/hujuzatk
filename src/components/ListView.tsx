import { parseISO, isSameDay, startOfToday } from 'date-fns';
import { MagnifyingGlass, Users, FileText } from 'phosphor-react';
import { cn } from '../utils/cn';
import { t, type Language } from '../lib/i18n';
import { formatTz } from '../utils/formatTz';
import type { ListFilter } from '../utils/constants';

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
  setShowInvoiceModal: (v: boolean) => void;
  listContainerRef: React.RefObject<HTMLDivElement | null>;
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
  setShowInvoiceModal,
  listContainerRef,
  currency,
  lang,
  tz,
}: ListViewProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-6 items-center justify-between">
        <div className="flex gap-1 bg-slate-100 p-1.5 rounded-[1.25rem] w-full lg:w-auto">
          {(['upcoming', 'active', 'past', 'canceled', 'all'] as ListFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setListFilter(f)}
              className={cn(
                'flex-1 lg:flex-none px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all',
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
            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              <th className="px-6 py-5 text-left">{t(lang, 'list.guest')}</th>
              <th className="px-6 py-5 text-left">{t(lang, 'list.room')}</th>
              <th className="px-6 py-5 text-left">{t(lang, 'list.dates')}</th>
              <th className="px-6 py-5 text-right">{t(lang, 'list.amount')}</th>
              <th className="px-6 py-5 text-right">{t(lang, 'list.balance')}</th>
              <th className="px-6 py-5 text-center">{t(lang, 'list.status')}</th>
              <th className="px-6 py-5" />
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
                const checkOut = parseISO(b.checkOut);
                const today = startOfToday();
                let statusColor = 'bg-slate-100 text-slate-500';
                let statusText = t(lang, 'list.upcoming');

                if (b.status === 'CANCELED') {
                  statusColor = 'bg-red-50 text-red-500 line-through';
                  statusText = t(lang, 'list.canceled');
                } else if (isSameDay(checkIn, today)) {
                  statusColor = 'bg-red-500 text-white font-black animate-pulse';
                  statusText = t(lang, 'list.checkInToday');
                } else if (checkIn < today && checkOut > today) {
                  statusColor = 'bg-emerald-600 text-white font-black';
                  statusText = t(lang, 'list.active');
                } else if (checkOut <= today) {
                  statusColor = 'bg-slate-200 text-slate-400';
                  statusText = t(lang, 'list.past');
                }

                return (
                  <tr
                    key={b.id}
                    className={cn('group hover:bg-slate-50 transition-colors', b.status === 'CANCELED' && 'opacity-60')}
                  >
                    <td className="px-6 py-5">
                      <div className="font-black text-slate-900 leading-tight">{b.guestName}</div>
                      <div className="text-[10px] font-bold text-slate-400 mt-0.5 tracking-tight uppercase">{b.guestPhone}</div>
                    </td>
                    <td className="px-6 py-5 font-black text-slate-900">{b.room}</td>
                    <td className="px-6 py-5">
                      <div className="font-black text-slate-700 text-[11px] uppercase tracking-tighter">{formatTz(b.checkIn, 'dd MMM yyyy', tz, lang)}</div>
                      <div className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">
                        {b.nights} {t(lang, 'list.nights')} · {formatTz(b.checkOut, 'dd MMM', tz, lang)}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right font-black text-slate-900">
                      {currency} {b.totalPrice}
                    </td>
                    <td className={cn('px-6 py-5 text-right font-black', b.remaining > 0 ? 'text-red-500' : 'text-emerald-600')}>
                      {currency} {b.remaining}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={cn('px-2.5 py-1 rounded-[10px] text-[10px] font-black uppercase tracking-widest', statusColor)}>{statusText}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button
                        onClick={() => {
                          setSelectedBooking(b);
                          setShowInvoiceModal(true);
                        }}
                        className="h-10 w-10 flex items-center justify-center rounded-xl text-emerald-600 hover:bg-emerald-50 transition-all"
                        title={t(lang, 'list.view')}
                      >
                        <FileText size={20} weight="bold" />
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
