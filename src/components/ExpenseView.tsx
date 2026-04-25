import { useEffect, useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import {
  CurrencyCircleDollar, Plus, Trash, X, Pencil, Lightning,
  Drop, Wrench, Package, DotsThree,
} from 'phosphor-react';
import { apolloClient } from '../lib/apolloClient';
import { t, type Language } from '../lib/i18n';
import { cn } from '../utils/cn';
import { formatTz } from '../utils/formatTz';
import { useAnchoredPosition, type ModalAnchor } from './Modals';
import {
  GET_EXPENSES_QUERY,
  CREATE_EXPENSE_MUTATION,
  UPDATE_EXPENSE_MUTATION,
  DELETE_EXPENSE_MUTATION,
} from '../lib/graphql';
import type { SessionUser } from '../lib/authService';

interface Props {
  session: SessionUser;
  lang: Language;
  tz: string;
  currency: string;
}

interface Expense {
  id: string;
  roomId: string | null;
  date: string;
  amount: number;
  category: string;
  reason: string;
  notes: string | null;
}

const CATEGORIES = ['utilities', 'cleaning', 'maintenance', 'supplies', 'other'] as const;
const CATEGORY_ICONS: Record<string, any> = {
  utilities: Lightning,
  cleaning: Drop,
  maintenance: Wrench,
  supplies: Package,
  other: DotsThree,
};
const CATEGORY_COLORS: Record<string, string> = {
  utilities: 'text-amber-600 bg-amber-50',
  cleaning: 'text-sky-600 bg-sky-50',
  maintenance: 'text-orange-600 bg-orange-50',
  supplies: 'text-emerald-600 bg-emerald-50',
  other: 'text-slate-600 bg-slate-100',
};

export default function ExpenseView({ session, lang, tz, currency }: Props) {
  const isRtl = lang === 'ar';
  const rooms = session.tenant.rooms || [];
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAnchor, setModalAnchor] = useState<ModalAnchor>(null);

  const load = async () => {
    setLoading(true);
    try {
      const variables: any = {
        startDate: new Date(startDate + 'T00:00:00').toISOString(),
        endDate: new Date(endDate + 'T23:59:59').toISOString(),
      };
      if (roomFilter !== 'all') variables.roomId = roomFilter === 'general' ? null : roomFilter;
      const { data } = await apolloClient.query({ query: GET_EXPENSES_QUERY, variables, fetchPolicy: 'network-only' });
      setExpenses((data as any)?.getExpenses || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [startDate, endDate, roomFilter]);

  const total = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const totalsByRoom = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      const key = e.roomId || 'general';
      map[key] = (map[key] || 0) + e.amount;
    });
    return map;
  }, [expenses]);
  const roomNameMap = Object.fromEntries(rooms.map((r: any) => [r.id, r.name]));

  const handleDelete = async (id: string) => {
    if (!confirm(t(lang, 'expenses.delete') + '?')) return;
    await apolloClient.mutate({ mutation: DELETE_EXPENSE_MUTATION, variables: { id } });
    await load();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <CurrencyCircleDollar size={32} weight="duotone" className="text-emerald-500" />
          <h1 className="text-2xl font-black text-slate-800">{t(lang, 'expenses.title')}</h1>
        </div>
        <button
          onClick={(e) => { setEditing(null); setModalAnchor({ x: e.clientX, y: e.clientY }); setShowModal(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black px-5 py-2.5 rounded-2xl flex items-center gap-2"
        >
          <Plus size={16} weight="bold" />
          {t(lang, 'expenses.add')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t(lang, 'expenses.from')}</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm font-black focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t(lang, 'expenses.to')}</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm font-black focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t(lang, 'expenses.room')}</label>
          <select value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 pe-10 text-sm font-black focus:ring-2 focus:ring-emerald-500">
            <option value="all">{t(lang, 'expenses.allRooms')}</option>
            <option value="general">{t(lang, 'expenses.general')}</option>
            {rooms.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="flex-1 text-end">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{t(lang, 'expenses.totalRange')}</div>
          <div className="text-2xl font-black text-slate-900 tabular-nums" dir="ltr">
            {currency} {total.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Per-room totals strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-100 rounded-xl p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t(lang, 'expenses.general')}</p>
          <p className="text-lg font-black text-slate-800 tabular-nums" dir="ltr">{currency} {(totalsByRoom['general'] || 0).toFixed(2)}</p>
        </div>
        {rooms.slice(0, 6).map((r: any) => (
          <div key={r.id} className="bg-slate-50 rounded-xl p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{r.name}</p>
            <p className="text-lg font-black text-slate-800 tabular-nums" dir="ltr">{currency} {(totalsByRoom[r.id] || 0).toFixed(2)}</p>
          </div>
        ))}
      </div>

      {/* Expense list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        {loading && <div className="text-center py-12 text-slate-400 text-sm">Loading…</div>}
        {!loading && expenses.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <CurrencyCircleDollar size={48} weight="duotone" className="mx-auto mb-3" />
            <p className="font-semibold">{t(lang, 'expenses.empty')}</p>
          </div>
        )}
        {!loading && expenses.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-start">{t(lang, 'expenses.date')}</th>
                  <th className="px-4 py-3 text-start">{t(lang, 'expenses.category')}</th>
                  <th className="px-4 py-3 text-start">{t(lang, 'expenses.reason')}</th>
                  <th className="px-4 py-3 text-start">{t(lang, 'expenses.room')}</th>
                  <th className="px-4 py-3 text-end">{t(lang, 'expenses.amount')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {expenses.map((e) => {
                  const Icon = CATEGORY_ICONS[e.category] || DotsThree;
                  return (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-700 whitespace-nowrap">
                        {formatTz(e.date, 'dd MMM yyyy', tz, lang)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-black', CATEGORY_COLORS[e.category] || CATEGORY_COLORS.other)}>
                          <Icon size={14} weight="bold" />
                          {t(lang, `expenses.cat_${e.category}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {e.reason}
                        {e.notes && <p className="text-xs text-slate-400 font-medium mt-0.5">{e.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-bold text-xs">
                        {e.roomId ? roomNameMap[e.roomId] || e.roomId : <span className="italic text-slate-400">{t(lang, 'expenses.general')}</span>}
                      </td>
                      <td className="px-4 py-3 text-end font-black text-slate-900 tabular-nums whitespace-nowrap" dir="ltr">
                        {currency} {e.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-end whitespace-nowrap">
                        <button
                          onClick={(ev) => { setEditing(e); setModalAnchor({ x: ev.clientX, y: ev.clientY }); setShowModal(true); }}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors"
                        >
                          <Pencil size={15} weight="bold" />
                        </button>
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash size={15} weight="bold" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <ExpenseModal
          existing={editing}
          rooms={rooms}
          lang={lang}
          currency={currency}
          anchor={modalAnchor}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={async () => { await load(); setShowModal(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

// ---- Add/Edit modal ----
function ExpenseModal({ existing, rooms, lang, currency, anchor, onClose, onSaved }: {
  existing: Expense | null;
  rooms: any[];
  lang: Language;
  currency: string;
  anchor: ModalAnchor;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const isRtl = lang === 'ar';
  const { ref, pos } = useAnchoredPosition(anchor);
  const [date, setDate] = useState(existing ? existing.date.split('T')[0] : format(new Date(), 'yyyy-MM-dd'));
  const [roomId, setRoomId] = useState(existing?.roomId ?? '');
  const [amount, setAmount] = useState(existing?.amount.toString() || '');
  const [category, setCategory] = useState(existing?.category || 'other');
  const [reason, setReason] = useState(existing?.reason || '');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 0) { setError(t(lang, 'expenses.invalidAmount')); return; }
    if (!reason.trim()) { setError(t(lang, 'expenses.reasonRequired')); return; }
    setSaving(true);
    try {
      const input = {
        roomId: roomId || null,
        date: new Date(date + 'T12:00:00').toISOString(),
        amount: amt,
        category,
        reason: reason.trim(),
        notes: notes.trim() || null,
      };
      if (existing) {
        await apolloClient.mutate({ mutation: UPDATE_EXPENSE_MUTATION, variables: { id: existing.id, input } });
      } else {
        await apolloClient.mutate({ mutation: CREATE_EXPENSE_MUTATION, variables: { input } });
      }
      await onSaved();
    } catch (err: any) {
      setError(err.graphQLErrors?.[0]?.message || err.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={cn('fixed inset-0 z-[200]', pos ? 'bg-slate-900/10' : 'bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4')}
      onClick={onClose}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div
        ref={ref as any}
        onClick={(e) => e.stopPropagation()}
        style={pos ? { position: 'absolute', top: pos.top, left: pos.left } : undefined}
        className={cn('bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-7 relative', pos && 'max-w-[min(28rem,calc(100vw-2rem))]')}
      >
        <button onClick={onClose} className={cn('absolute top-4', isRtl ? 'left-4' : 'right-4', 'text-slate-400 hover:text-slate-700')}>
          <X size={20} weight="bold" />
        </button>
        <h2 className="text-xl font-black text-slate-900 mb-4">{existing ? t(lang, 'expenses.editTitle') : t(lang, 'expenses.addTitle')}</h2>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t(lang, 'expenses.date')}</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-black focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t(lang, 'expenses.amount')} ({currency})</label>
              <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-black focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t(lang, 'expenses.room')}</label>
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 pe-10 text-sm font-black focus:ring-2 focus:ring-emerald-500">
              <option value="">{t(lang, 'expenses.general')}</option>
              {rooms.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t(lang, 'expenses.category')}</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 pe-10 text-sm font-black focus:ring-2 focus:ring-emerald-500">
              {CATEGORIES.map((c) => <option key={c} value={c}>{t(lang, `expenses.cat_${c}`)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t(lang, 'expenses.reason')}</label>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder={t(lang, 'expenses.reasonPlaceholder')}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-black focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t(lang, 'expenses.notes')}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500" />
          </div>
          {error && <p className="text-sm text-red-600 font-semibold">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-emerald-600 text-white py-3 rounded-2xl text-sm font-black hover:bg-emerald-700 disabled:opacity-50">
              {saving ? '…' : t(lang, 'expenses.save')}
            </button>
            <button onClick={onClose}
              className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-2xl text-sm font-black hover:bg-slate-200">
              {t(lang, 'expenses.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
