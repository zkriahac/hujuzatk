import { useState, useMemo, useEffect } from 'react';
import { parseISO, isSameDay, startOfToday } from 'date-fns';
import { MagnifyingGlass, Users, Eye, List, ArrowSquareIn, ArrowSquareOut, CheckCircle, Archive, XCircle, Trash, ArrowsClockwise, PencilSimple, X as XIcon, Upload } from 'phosphor-react';
import { cn } from '../utils/cn';
import { t, type Language } from '../lib/i18n';
import { formatTz } from '../utils/formatTz';
import { type ListFilter, getEffectiveStatus } from '../utils/constants';

export type SourceFilter = 'all' | 'synced' | 'manual';

interface ListViewProps {
  bookings: any[];
  fullFiltered: any[];
  visibleCount: number;
  totalCount: number;
  onLoadMore: () => void;
  listFilter: ListFilter;
  setListFilter: (f: ListFilter) => void;
  sourceFilter: SourceFilter;
  setSourceFilter: (f: SourceFilter) => void;
  onBulkDelete: (ids: string[]) => Promise<void>;
  bulkDeleting?: boolean;
  listSearchTerm: string;
  setListSearchTerm: (s: string) => void;
  setShowAddModal: (v: boolean) => void;
  onImportClick: () => void;
  setSelectedBooking: (b: any) => void;
  serverHasMore?: boolean;
  serverLoading?: boolean;
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
  sourceFilter,
  setSourceFilter,
  onBulkDelete,
  bulkDeleting = false,
  listSearchTerm,
  setListSearchTerm,
  setShowAddModal,
  onImportClick,
  setSelectedBooking,
  serverHasMore = false,
  serverLoading = false,
  listContainerRef,
  rooms,
  currency,
  lang,
  tz,
}: ListViewProps) {
  const roomNameMap = Object.fromEntries(rooms.map((r: any) => [r.id, r.name]));

  // Selection only meaningful on the "all" tab where source filter + bulk-delete live.
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Reset selection whenever the underlying list changes (filter / search / page reload).
  useEffect(() => {
    setSelected(new Set());
  }, [listFilter, sourceFilter, listSearchTerm]);

  const visibleIds = useMemo(() => bookings.map((b: any) => b.id as string), [bookings]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAllVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });

  const clearSelection = () => setSelected(new Set());

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    // Tailor confirmation copy: if every selected booking is a sync row, use the synced
    // warning (re-import notice); otherwise use the manual/all warning.
    const allSynced = ids.every((id) => {
      const b = fullFiltered.find((x: any) => x.id === id);
      return b && !!b.externalChannel;
    });
    const label = allSynced
      ? t(lang, 'list.bulkDeleteSyncedConfirm')
      : t(lang, 'list.bulkDeleteAllConfirm');
    if (!confirm(label.replace('{n}', String(ids.length)))) return;
    await onBulkDelete(ids);
    clearSelection();
  };

  const FILTER_META: { id: ListFilter; Icon: any; active: string }[] = [
    { id: 'today_checkin',  Icon: ArrowSquareIn,  active: 'bg-emerald-500 text-white shadow-sm' },
    { id: 'today_checkout', Icon: ArrowSquareOut, active: 'bg-blue-500 text-white shadow-sm' },
    { id: 'active',         Icon: CheckCircle,    active: 'bg-violet-500 text-white shadow-sm' },
    { id: 'past',           Icon: Archive,        active: 'bg-slate-600 text-white shadow-sm' },
    { id: 'canceled',       Icon: XCircle,        active: 'bg-rose-500 text-white shadow-sm' },
    { id: 'all',            Icon: List,           active: 'bg-white text-slate-900 shadow-md' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-6 items-center justify-between">
        <div className="flex gap-1 bg-slate-100 p-1.5 rounded-2xl w-full lg:w-auto overflow-x-auto">
          {FILTER_META.map(({ id, Icon, active }) => (
            <button
              key={id}
              onClick={() => setListFilter(id)}
              className={cn(
                'flex-none flex items-center gap-1.5 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap',
                listFilter === id ? active : 'text-slate-400 hover:text-slate-600',
              )}
            >
              <Icon size={13} weight="bold" />
              {t(lang, `list.${id}`)}
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
            onClick={onImportClick}
            className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest whitespace-nowrap hover:bg-slate-50 active:scale-95 transition-all"
          >
            <Upload size={13} weight="bold" />
            {t(lang, 'list.import')}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-600 text-white px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest whitespace-nowrap shadow-lg shadow-emerald-50 active:scale-95 transition-all"
          >
            {t(lang, 'list.new')}
          </button>
        </div>
      </div>

      {/* Source filter (only shown on the "all" tab) */}
      {listFilter === 'all' && (
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex">
          <div className="flex gap-1 bg-slate-50 p-1 rounded-xl flex-1">
            {([
              { id: 'all',    Icon: List },
              { id: 'synced', Icon: ArrowsClockwise },
              { id: 'manual', Icon: PencilSimple },
            ] as const).map(({ id, Icon }) => (
              <button
                key={id}
                onClick={() => setSourceFilter(id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap',
                  sourceFilter === id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600',
                )}
              >
                <Icon size={12} weight="bold" />
                {t(lang, `list.source.${id}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selection bar — appears only when something is checked.
          Sticky-ish look (has stronger shadow) so it's clear an action is pending. */}
      {listFilter === 'all' && selected.size > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center w-8 h-8 rounded-full bg-rose-600 text-white text-xs font-black tabular-nums">
              {selected.size}
            </span>
            <span className="text-sm font-bold text-rose-900">
              {t(lang, 'list.selectedCount').replace('{n}', String(selected.size))}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearSelection}
              disabled={bulkDeleting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all"
            >
              <XIcon size={12} weight="bold" />
              {t(lang, 'list.clearSelection')}
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest bg-rose-600 text-white hover:bg-rose-700 active:scale-95 disabled:opacity-60 disabled:cursor-wait transition-all"
            >
              <Trash size={13} weight="bold" />
              {bulkDeleting
                ? t(lang, 'list.deleting')
                : t(lang, 'list.deleteSelected').replace('{n}', String(selected.size))}
            </button>
          </div>
        </div>
      )}

      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-auto max-h-[75vh] scrollbar-hide"
        ref={listContainerRef}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
              {listFilter === 'all' && (
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    aria-label={t(lang, 'list.selectAllVisible')}
                    className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                </th>
              )}
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
                <td colSpan={listFilter === 'all' ? 8 : 7} className="px-6 py-20 text-center">
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
                    className={cn(
                      'group hover:bg-slate-50 transition-colors',
                      b.status === 'CANCELED' && 'opacity-60',
                      selected.has(b.id) && 'bg-rose-50/60',
                    )}
                  >
                    {listFilter === 'all' && (
                      <td className="px-3 py-3 align-top">
                        <input
                          type="checkbox"
                          checked={selected.has(b.id)}
                          onChange={() => toggleOne(b.id)}
                          aria-label={t(lang, 'list.selectRow')}
                          className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer mt-1"
                        />
                      </td>
                    )}
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

      {serverLoading && (
        <div className="flex justify-center pt-6">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {!serverLoading && (visibleCount < totalCount || serverHasMore) && totalCount > 0 && (
        <div className="flex justify-center pt-6">
          <button
            onClick={onLoadMore}
            className="bg-emerald-600 text-white px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-emerald-50 hover:bg-emerald-700 transition-all active:scale-95"
          >
            {serverHasMore ? t(lang, 'list.loadMore') : `Load ${Math.min(50, totalCount - visibleCount)} more of ${totalCount}`}
          </button>
        </div>
      )}
    </div>
  );
}
