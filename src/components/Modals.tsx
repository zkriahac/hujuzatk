import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import {
  X, Sparkle, Users, Minus, Plus, CreditCard, FileText, Printer,
  PencilSimple, Prohibit, Trash, Check, WarningCircle, CaretDown, CaretUp, Upload, DownloadSimple,
  ArrowSquareOut, Lock, ArrowsClockwise,
} from 'phosphor-react';
import { useBulkImportBookings } from '../hooks/useGraphQL';
import { cn } from '../utils/cn';
import { t, type Language } from '../lib/i18n';
import { formatTz } from '../utils/formatTz';
import { formatDateOnly } from '../utils/formatDateOnly';
import { sanitizeNumeric } from '../utils/digits';

// Parse a money input to a number rounded to 2 decimal places (cents).
// Empty / NaN → 0. Accepts Arabic-Indic / Persian digits via sanitizeNumeric so an
// Arabic keyboard on iOS doesn't strand the field at NaN.
const to2dp = (v: string): number => {
  const n = parseFloat(sanitizeNumeric(v));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};


// ---------- ANCHORED-POSITION HOOK ----------
// Returns a ref to attach to the modal card and a {top, left} style to apply when an anchor
// (viewport click coords) is provided. Falls back to null (centered layout) on small screens or
// when no anchor is passed.
export type ModalAnchor = { x: number; y: number } | null | undefined;
export function useAnchoredPosition(anchor: ModalAnchor) {
  const ref = useRef<HTMLElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    if (!anchor) { setPos(null); return; }
    if (typeof window === 'undefined' || window.innerWidth < 640) { setPos(null); return; }
    const node = ref.current;
    const rect = node?.getBoundingClientRect();
    const w = rect?.width || 480;
    const h = rect?.height || 520;
    const M = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = anchor.x + M;
    let top = anchor.y + M;
    if (left + w > vw - M) left = anchor.x - w - M;
    if (top + h > vh - M) top = anchor.y - h - M;
    left = Math.max(M, Math.min(left, vw - w - M));
    top = Math.max(M, Math.min(top, vh - h - M));
    setPos({ top, left });
  }, [anchor]);
  return { ref, pos };
}

// ---------- CONFIRM MODAL ----------

function ConfirmModal({ message, onConfirm, onCancel, confirmColor = 'bg-red-500 hover:bg-red-600', confirmLabel, cancelLabel }: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmColor?: string;
  confirmLabel: string;
  cancelLabel: string;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center space-y-6" onClick={e => e.stopPropagation()}>
        <WarningCircle size={48} weight="fill" className="text-amber-500 mx-auto" />
        <p className="text-sm font-bold text-slate-700">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 border-2 border-slate-200 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all ${confirmColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- ADD BOOKING MODAL ----------

interface AddBookingModalProps {
  onClose: () => void;
  onAdd: (booking: any) => void;
  initialDate: string;
  initialRoom: string;
  rooms: any[];
  currency: string;
  lang: Language;
  anchor?: ModalAnchor;
  /** Per-tenant default from Settings → falls through to 50 if unset. */
  defaultNightPrice?: number;
}

export function AddBookingModal({ onClose, onAdd, initialDate, initialRoom, rooms, currency, lang, anchor, defaultNightPrice }: AddBookingModalProps) {
  const guestNameInputRef = useRef<HTMLInputElement>(null);
  const [nameError, setNameError] = useState(false);
  const { ref: anchorRef, pos: anchorPos } = useAnchoredPosition(anchor);

  // Pull from tenant settings (Settings → Default Night Price). Fallback 50 matches authService.
  const initialNightPrice = typeof defaultNightPrice === 'number' && defaultNightPrice > 0 ? defaultNightPrice : 50;

  const [f, setF] = useState({
    guestName: '',
    city: '',
    phone: '',
    idNumber: '',
    source: '',
    checkIn: initialDate,
    nights: 1,
    room: initialRoom,
  });
  // Money inputs are stored as strings so mid-typed values like "12." aren't snapped
  // back to "12" between keystrokes. Sanitized on every change (Arabic digits → ASCII)
  // and converted to numbers via to2dp() for totals + submit.
  const [nightPriceStr, setNightPriceStr] = useState<string>(String(initialNightPrice));
  const [depositStr, setDepositStr] = useState<string>('');
  const nightPriceNum = to2dp(nightPriceStr);
  const depositNum = to2dp(depositStr);
  const [notes, setNotes] = useState('');
  const [showExtra, setShowExtra] = useState(false);

  useEffect(() => {
    guestNameInputRef.current?.focus();
  }, []);

  const checkOut = format(addDays(parseISO(f.checkIn), Math.max(1, f.nights)), 'yyyy-MM-dd');
  const totalPrice = Math.max(1, f.nights) * nightPriceNum;
  const remaining = totalPrice - depositNum;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.guestName.trim()) {
      setNameError(true);
      guestNameInputRef.current?.focus();
      return;
    }
    onAdd({ guestName: f.guestName, city: f.city, phone: f.phone, guestIdNumber: f.idNumber || null, source: f.source, room: f.room, checkIn: f.checkIn, checkOut, nightPrice: nightPriceNum, deposit: depositNum, notes: notes || undefined });
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-[200]',
        // Anchored (desktop) — very faint tint so the highlighted calendar cell stays visible.
        // Centered (mobile/no anchor) — dim + blur for focus on the full-screen modal.
        anchorPos ? 'bg-slate-900/10' : 'bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4',
      )}
      onClick={onClose}
    >
      <form
        ref={anchorRef as any}
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        style={anchorPos ? { position: 'absolute', top: anchorPos.top, left: anchorPos.left } : undefined}
        className={cn(
          'relative bg-white rounded-2xl max-w-lg w-full p-6 sm:p-5 shadow-3xl max-h-[95vh] overflow-y-auto',
          anchorPos && 'max-w-[min(32rem,calc(100vw-2rem))]',
        )}
      >
        <button type="button" onClick={onClose} className="absolute top-4 end-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
          <X size={20} weight="bold" />
        </button>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-5 flex items-center gap-3">
          <Sparkle size={28} className="text-emerald-500" weight="fill" />
          {t(lang, 'booking.addTitle')}
        </h2>
        <div className="space-y-3">
          <div className="relative group">
            <div className={cn('absolute inset-y-0 flex items-center pointer-events-none text-slate-300 group-focus-within:text-emerald-500 transition-colors', lang === 'ar' ? 'right-4' : 'left-4')}>
              <Users size={18} weight="bold" />
            </div>
            <input
              ref={guestNameInputRef}
              className={cn(
                'w-full bg-slate-50 rounded-2xl py-2.5 text-sm font-bold focus:ring-2 transition-all',
                lang === 'ar' ? 'pr-11 pl-4' : 'pl-11 pr-4',
                nameError ? 'ring-2 ring-red-400 border-red-300 focus:ring-red-400' : 'border-slate-100 focus:ring-emerald-500'
              )}
              placeholder={t(lang, 'booking.guestName')}
              value={f.guestName}
              onChange={(e) => { setF({ ...f, guestName: e.target.value }); if (nameError) setNameError(false); }}
            />
          </div>
          <input
            className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
            placeholder={t(lang, 'booking.idNumber')}
            value={f.idNumber}
            onChange={(e) => setF({ ...f, idNumber: e.target.value })}
          />
          <select
            className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
            value={f.source}
            onChange={(e) => setF({ ...f, source: e.target.value })}
          >
            <option value="">{t(lang, 'booking.source')}</option>
            <option value="Direct">Direct</option>
            <option value="Airbnb">Airbnb</option>
            <option value="Gathern">Gathern</option>
            <option value="Booking.com">Booking.com</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Phone">Phone</option>
            <option value="Walk-in">Walk-in</option>
            <option value="Other">Other</option>
          </select>

          {/* Collapsible extra details */}
          <button
            type="button"
            onClick={() => setShowExtra(v => !v)}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors px-1 py-1"
          >
            <span>{t(lang, 'booking.extraDetails')}</span>
            {!showExtra && (f.city || f.phone || notes) && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            )}
            {showExtra ? <CaretUp size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />}
          </button>
          {showExtra && (
            <div className="space-y-3 px-1">
              <div className="flex gap-3">
                <input
                  className="w-1/2 bg-slate-50 border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                  placeholder={t(lang, 'booking.city')}
                  value={f.city}
                  onChange={(e) => setF({ ...f, city: e.target.value })}
                />
                <input
                  className="w-1/2 bg-slate-50 border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                  placeholder={t(lang, 'booking.phone')}
                  value={f.phone}
                  onChange={(e) => setF({ ...f, phone: e.target.value })}
                />
              </div>
              <textarea
                rows={3}
                className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
                placeholder={t(lang, 'booking.notesPlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          )}
          <div className="flex gap-3">
            <div className="w-1/2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 block px-2">
                {t(lang, 'booking.checkIn')}
              </label>
              <input
                type="date"
                className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-black focus:ring-2 focus:ring-emerald-500 transition-all"
                value={f.checkIn}
                onChange={(e) => setF({ ...f, checkIn: e.target.value })}
              />
            </div>
            <div className="w-1/2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 block px-2">
                {t(lang, 'booking.nights')}
              </label>
              <div
                className="flex items-center bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden select-none"
                onWheel={(e) => {
                  const delta = e.deltaY < 0 ? 1 : -1;
                  setF({ ...f, nights: Math.max(1, f.nights + delta) });
                }}
              >
                <button type="button" onClick={() => setF({ ...f, nights: Math.max(1, f.nights - 1) })}
                  className="px-3 py-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition-colors active:bg-slate-300">
                  <Minus size={18} weight="bold" />
                </button>
                <span className="flex-1 text-center text-sm font-black text-slate-900 tabular-nums">{f.nights}</span>
                <button type="button" onClick={() => setF({ ...f, nights: f.nights + 1 })}
                  className="px-3 py-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition-colors active:bg-slate-300">
                  <Plus size={18} weight="bold" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-1/2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 block px-2">
                {t(lang, 'booking.room')}
              </label>
              <select
                className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-black focus:ring-2 focus:ring-emerald-500 transition-all"
                value={f.room}
                onChange={(e) => setF({ ...f, room: e.target.value })}
              >
                {rooms.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="w-1/2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 block px-2">
                {t(lang, 'booking.priceNight')}
              </label>
              <div className="relative">
                <div className={cn('absolute inset-y-0 flex items-center pointer-events-none text-slate-300 text-[10px] font-black uppercase', lang === 'ar' ? 'right-4' : 'left-4')}>{currency}</div>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  className={cn('w-full bg-slate-50 border-slate-100 rounded-2xl py-2.5 text-sm font-black focus:ring-2 focus:ring-emerald-500 transition-all', lang === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4')}
                  value={nightPriceStr}
                  onChange={(e) => setNightPriceStr(sanitizeNumeric(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Compact amounts row — 3 columns side-by-side, light surface for a softer
              look than the previous heavy black panel. */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mt-2">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">{t(lang, 'booking.total')}</p>
                <p className="text-base font-black text-slate-900 tabular-nums">{currency} {totalPrice}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">{t(lang, 'booking.deposit')}</p>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  placeholder="0"
                  className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1 text-base font-black tabular-nums focus:ring-2 focus:ring-emerald-500 transition-all"
                  value={depositStr}
                  onChange={(e) => setDepositStr(sanitizeNumeric(e.target.value))}
                />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-600 mb-1">{t(lang, 'booking.remaining')}</p>
                <p className="text-base font-black text-emerald-700 tabular-nums">{currency} {remaining}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-3 border-2 border-slate-200 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition-all">
            {t(lang, 'booking.cancel')}
          </button>
          <button
            type="submit"
            className="flex-[2] py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-50 hover:bg-emerald-700 transition-all active:scale-95"
          >
            {t(lang, 'booking.save')}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- BOOKING DETAILS MODAL ----------

interface BookingDetailsModalProps {
  booking: any;
  onClose: () => void;
  onDelete: (id: any) => void;
  onPrintInvoice: () => void;
  onUpdateStatus: (id: any, status: string) => void;
  onUpdate: (id: any, updates: any) => void;
  currency: string;
  lang: Language;
  tz: string;
  rooms: any[];
  anchor?: ModalAnchor;
}

export function BookingDetailsModal({
  booking, onClose, onDelete, onPrintInvoice, onUpdateStatus, onUpdate,
  currency, lang, tz, rooms, anchor,
}: BookingDetailsModalProps) {
  const [editMode, setEditMode] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ message: string; action: () => void; color?: string } | null>(null);
  const { ref: anchorRef, pos: anchorPos } = useAnchoredPosition(anchor);

  const nightsFromBooking = Math.round(
    (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000
  ) || 1;

  const [f, setF] = useState({
    guestName: booking.guestName || '',
    city: booking.city || '',
    phone: booking.guestPhone || '',
    idNumber: (booking as any).guestIdNumber || '',
    // Normalize the source value so the <option> with the same casing matches.
    // Sync stores channel names lowercase ('airbnb' / 'gathern' / 'booking.com'),
    // but our select options are capitalized. Without this, synced bookings would
    // render the select stuck on the empty placeholder even though the booking
    // does have a source.
    source: ((s: string) => {
      if (!s) return '';
      const lower = s.toLowerCase();
      if (lower === 'airbnb')      return 'Airbnb';
      if (lower === 'gathern')     return 'Gathern';
      if (lower === 'booking.com') return 'Booking.com';
      return s; // already in correct casing (Direct, WhatsApp, Phone, etc.)
    })((booking as any).source || ''),
    room: booking.room || '',
    checkIn: booking.checkIn ? booking.checkIn.split('T')[0] : '',
    nights: nightsFromBooking,
  });
  // String mirrors so mid-typed "12." doesn't collapse to "12" between keystrokes,
  // and so Arabic-Indic digits can be sanitized in place before parseFloat.
  const [nightPriceStr, setNightPriceStr] = useState<string>(String(booking.nightPrice || 0));
  const [depositStr, setDepositStr] = useState<string>(booking.deposit ? String(booking.deposit) : '');
  const nightPriceNum = to2dp(nightPriceStr);
  const depositNum = to2dp(depositStr);
  const [editNotes, setEditNotes] = useState((booking as any).notes || '');
  const [showExtra, setShowExtra] = useState(!!(booking.city || booking.guestPhone || (booking as any).notes));

  const checkOut = format(addDays(parseISO(f.checkIn), Math.max(1, f.nights)), 'yyyy-MM-dd');
  const totalPrice = Math.max(1, f.nights) * nightPriceNum;
  const remaining = totalPrice - depositNum;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.guestName.trim()) return;
    onUpdate(booking.id!, {
      guestName: f.guestName,
      city: f.city,
      guestPhone: f.phone,
      guestIdNumber: f.idNumber || null,
      source: f.source || undefined,
      room: f.room,
      checkIn: f.checkIn,
      checkOut,
      nightPrice: nightPriceNum,
      deposit: depositNum,
      notes: editNotes.trim() !== '' ? editNotes : null,
    });
  };

  if (editMode) {
    // Edit form is dense + tall; anchoring it to the originating calendar cell creates
    // an awkward off-screen modal. Always center the edit modal regardless of anchor.
    return (
      <div
        className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        onClick={() => setEditMode(false)}
      >
        <form
          onSubmit={handleSave}
          onClick={(e) => e.stopPropagation()}
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
          className="relative bg-white rounded-2xl max-w-lg w-full p-6 sm:p-5 shadow-3xl max-h-[95vh] overflow-y-auto"
        >
          <button type="button" onClick={() => setEditMode(false)} className="absolute top-4 end-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
            <X size={20} weight="bold" />
          </button>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-5">{t(lang, 'booking.editTitle')}</h2>
          <div className="space-y-3">
            <input
              className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
              placeholder={t(lang, 'booking.guestName')}
              value={f.guestName}
              onChange={(e) => setF({ ...f, guestName: e.target.value })}
            />
            <input
              className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
              placeholder={t(lang, 'booking.idNumber')}
              value={f.idNumber}
              onChange={(e) => setF({ ...f, idNumber: e.target.value })}
            />
            {/* Source — synced bookings render as a plain read-only badge (no select
                chevron, since there's nothing to choose from), so the UI doesn't suggest
                editability. Channel-coloured to match the reservation pill. Manual
                bookings keep the editable select. */}
            {(() => {
              const channel: string | null = (booking as any).externalChannel ?? null;
              if (channel) {
                const channelLabel =
                  channel === 'airbnb'      ? 'Airbnb'
                : channel === 'gathern'     ? 'Gathern'
                : channel === 'booking.com' ? 'Booking.com'
                : channel.charAt(0).toUpperCase() + channel.slice(1);
                const tone =
                  channel === 'airbnb'      ? { bg: 'bg-rose-50',    fg: 'text-rose-700',    icon: 'text-rose-500',    border: 'border-rose-100' }
                : channel === 'gathern'     ? { bg: 'bg-emerald-50', fg: 'text-emerald-700', icon: 'text-emerald-500', border: 'border-emerald-100' }
                : channel === 'booking.com' ? { bg: 'bg-blue-50',    fg: 'text-blue-700',    icon: 'text-blue-500',    border: 'border-blue-100' }
                : { bg: 'bg-slate-50', fg: 'text-slate-700', icon: 'text-slate-400', border: 'border-slate-100' };
                return (
                  <div
                    className={cn('w-full rounded-2xl px-4 py-2.5 text-sm font-bold flex items-center gap-2.5 border', tone.bg, tone.fg, tone.border)}
                    title={t(lang, 'booking.sourceLocked')}
                    aria-disabled="true"
                  >
                    <ArrowsClockwise size={14} weight="bold" className={tone.icon} />
                    <span>{channelLabel}</span>
                    <span className="ms-auto inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest opacity-70">
                      <Lock size={11} weight="bold" />
                      {t(lang, 'booking.synced')}
                    </span>
                  </div>
                );
              }
              return (
                <select
                  className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all focus:ring-2 focus:ring-emerald-500"
                  value={f.source}
                  onChange={(e) => setF({ ...f, source: e.target.value })}
                >
                  <option value="">{t(lang, 'booking.source')}</option>
                  <option value="Direct">Direct</option>
                  <option value="Airbnb">Airbnb</option>
                  <option value="Gathern">Gathern</option>
                  <option value="Booking.com">Booking.com</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Phone">Phone</option>
                  <option value="Walk-in">Walk-in</option>
                  <option value="Other">Other</option>
                </select>
              );
            })()}

            {/* Collapsible extra details */}
            <button
              type="button"
              onClick={() => setShowExtra(v => !v)}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors px-1 py-1"
            >
              <span>{t(lang, 'booking.extraDetails')}</span>
              {!showExtra && (f.city || f.phone || editNotes) && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              )}
              {showExtra ? <CaretUp size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />}
            </button>
            {showExtra && (
              <div className="space-y-3 px-1">
                <div className="flex gap-3">
                  <input
                    className="w-1/2 bg-slate-50 border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder={t(lang, 'booking.city')}
                    value={f.city}
                    onChange={(e) => setF({ ...f, city: e.target.value })}
                  />
                  <input
                    className="w-1/2 bg-slate-50 border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder={t(lang, 'booking.phone')}
                    value={f.phone}
                    onChange={(e) => setF({ ...f, phone: e.target.value })}
                  />
                </div>
                <textarea
                  rows={3}
                  className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
                  placeholder={t(lang, 'booking.notesPlaceholder')}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>
            )}
            <div className="flex gap-3">
              <div className="w-1/2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 block px-2">{t(lang, 'booking.checkIn')}</label>
                <input
                  type="date"
                  className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-black focus:ring-2 focus:ring-emerald-500 transition-all"
                  value={f.checkIn}
                  onChange={(e) => setF({ ...f, checkIn: e.target.value })}
                />
              </div>
              <div className="w-1/2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 block px-2">{t(lang, 'booking.nights')}</label>
                <div
                  className="flex items-center bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden select-none"
                  onWheel={(e) => setF({ ...f, nights: Math.max(1, f.nights + (e.deltaY < 0 ? 1 : -1)) })}
                >
                  <button type="button" onClick={() => setF({ ...f, nights: Math.max(1, f.nights - 1) })}
                    className="px-3 py-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition-colors">
                    <Minus size={18} weight="bold" />
                  </button>
                  <span className="flex-1 text-center text-sm font-black text-slate-900 tabular-nums">{f.nights}</span>
                  <button type="button" onClick={() => setF({ ...f, nights: f.nights + 1 })}
                    className="px-3 py-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition-colors">
                    <Plus size={18} weight="bold" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-1/2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 block px-2">{t(lang, 'booking.room')}</label>
                <select
                  className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-black focus:ring-2 focus:ring-emerald-500 transition-all"
                  value={f.room}
                  onChange={(e) => setF({ ...f, room: e.target.value })}
                >
                  {(rooms || []).map((r: any) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-1/2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 block px-2">{t(lang, 'booking.priceNight')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-300 text-[10px] font-black uppercase">{currency}</div>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    className="w-full bg-slate-50 border-slate-100 rounded-2xl pl-12 pr-4 py-2.5 text-sm font-black focus:ring-2 focus:ring-emerald-500 transition-all"
                    value={nightPriceStr}
                    onChange={(e) => setNightPriceStr(sanitizeNumeric(e.target.value))}
                  />
                </div>
              </div>
            </div>
            {/* Compact amounts row — 3 columns side-by-side, light surface. */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">{t(lang, 'booking.total')}</p>
                  <p className="text-base font-black text-slate-900 tabular-nums">{currency} {totalPrice}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">{t(lang, 'booking.deposit')}</p>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    placeholder="0"
                    className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1 text-base font-black tabular-nums focus:ring-2 focus:ring-emerald-500 transition-all"
                    value={depositStr}
                    onChange={(e) => setDepositStr(sanitizeNumeric(e.target.value))}
                  />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-600 mb-1">{t(lang, 'booking.remaining')}</p>
                  <p className="text-base font-black text-emerald-700 tabular-nums">{currency} {remaining}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button type="button" onClick={() => setEditMode(false)}
              className="flex-1 py-3 border-2 border-slate-200 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition-all">
              {t(lang, 'booking.cancel')}
            </button>
            <button type="submit"
              className="flex-[2] py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-50 hover:bg-emerald-700 transition-all active:scale-95">
              {t(lang, 'booking.save')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div
      className={cn('fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[200]', !anchorPos && 'flex items-center justify-center p-4')}
      onClick={onClose}
    >
      <div
        ref={anchorRef as any}
        onClick={(e) => e.stopPropagation()}
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        style={anchorPos ? { position: 'absolute', top: anchorPos.top, left: anchorPos.left } : undefined}
        className={cn('relative bg-white rounded-2xl max-w-sm w-full p-5 shadow-3xl', anchorPos && 'max-w-[min(24rem,calc(100vw-2rem))]')}
      >
        <button type="button" onClick={onClose} className="absolute top-5 end-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
          <X size={20} weight="bold" />
        </button>
        <div className="flex justify-between items-start mb-8">
          <div>
            {booking.bookingNumber != null && (
              <div className="text-[11px] font-mono font-black tracking-widest text-slate-400 mb-1">
                #{String(booking.bookingNumber).padStart(4, '0')}
              </div>
            )}
            <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">{booking.guestName}</h2>
            <div className="flex gap-2 items-center">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-slate-100 rounded text-slate-500">
                {t(lang, 'list.room')} {(rooms.find((r: any) => r.id === booking.room)?.name) || booking.room}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
                {booking.nights} {t(lang, 'list.nights')}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6 mb-10">
          {(booking.guestPhone || booking.guestIdNumber || booking.city) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 -mt-4">
              {booking.guestPhone && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-1">{t(lang, 'booking.phone')}</p>
                  <p className="font-bold text-slate-700 text-sm">{booking.guestPhone}</p>
                </div>
              )}
              {booking.guestIdNumber && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-1">{t(lang, 'booking.idNumber').replace(/ \(.*\)$/, '')}</p>
                  <p className="font-bold text-slate-700 text-sm">{booking.guestIdNumber}</p>
                </div>
              )}
              {booking.city && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-1">{t(lang, 'booking.city')}</p>
                  <p className="font-bold text-slate-700 text-sm">{booking.city}</p>
                </div>
              )}
            </div>
          )}
          {(() => {
            let url: string | null = (booking as any).externalUrl ?? null;
            const channel: string | null = (booking as any).externalChannel ?? null;
            const explicitCode: string | null = (booking as any).externalReservationId ?? null;

            // Fallback: if the booking has a reservation code but no stored URL (e.g. it was
            // synced before the externalUrl extractor was added), construct an Airbnb URL on
            // the fly. Gathern doesn't expose a stable host-portal URL pattern so we leave
            // its `url` null but still render a non-clickable pill below.
            if (!url && channel === 'airbnb' && explicitCode) {
              url = `https://www.airbnb.com/hosting/reservations/details/${explicitCode}`;
            }

            // Nothing to show — bail. (Pure manual bookings hit this path.)
            if (!url && !explicitCode) return null;

            const channelLabel =
              channel === 'airbnb'      ? 'Airbnb'
            : channel === 'gathern'     ? 'Gathern'
            : channel === 'booking.com' ? 'Booking.com'
            : 'Channel';
            const tail = url ? (url.replace(/\/+$/, '').split('/').pop() || '') : '';
            const code = explicitCode || (/^[A-Z0-9_-]{4,}$/i.test(tail) ? tail : '');
            const tone =
              channel === 'airbnb'      ? { bg: 'bg-rose-50',    fg: 'text-rose-600',    border: 'border-rose-100' }
            : channel === 'gathern'     ? { bg: 'bg-emerald-50', fg: 'text-emerald-700', border: 'border-emerald-100' }
            : channel === 'booking.com' ? { bg: 'bg-blue-50',    fg: 'text-blue-700',    border: 'border-blue-100' }
            : { bg: 'bg-slate-50', fg: 'text-slate-700', border: 'border-slate-100' };
            const pillClass = cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black',
              tone.bg, tone.fg, tone.border,
            );
            const pillContent = (
              <>
                <span>{channelLabel}</span>
                {code && <span className="font-mono tracking-tight opacity-80">· {code}</span>}
                {url && <ArrowSquareOut size={13} weight="bold" />}
              </>
            );
            return (
              <div className="-mt-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-1.5">{t(lang, 'booking.reservation')}</p>
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" className={cn(pillClass, 'transition-colors hover:opacity-90')}>
                    {pillContent}
                  </a>
                ) : (
                  // No public host-portal URL (e.g. Gathern) — show the code without ↗ icon.
                  <span className={pillClass}>{pillContent}</span>
                )}
              </div>
            );
          })()}
          {(booking as any).notes && (
            <div className="-mt-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-1">{t(lang, 'booking.notes')}</p>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{(booking as any).notes}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-8 py-6 border-y border-slate-50">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-2">{t(lang, 'booking.checkIn')}</p>
              <p className="font-black text-slate-700 uppercase tracking-tighter">{formatDateOnly(booking.checkIn, 'dd MMM yyyy', lang)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-2">{t(lang, 'booking.checkOut').replace(' (auto)', '')}</p>
              <p className="font-black text-slate-700 uppercase tracking-tighter">{formatDateOnly(booking.checkOut, 'dd MMM yyyy', lang)}</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
              <span>{t(lang, 'booking.totalBill')}</span>
              <span className="text-slate-900 font-black text-lg">{currency} {booking.totalPrice}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-bold text-red-500 uppercase tracking-widest border-t border-slate-100 pt-3">
              <span>{t(lang, 'booking.remaining')}</span>
              <span className="font-black text-xl">{currency} {booking.remaining}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onPrintInvoice}
              className="py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <FileText size={16} weight="bold" /> {t(lang, 'booking.printInvoice')}
            </button>
            <button
              onClick={() => setEditMode(true)}
              className="py-4 bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <PencilSimple size={16} weight="bold" /> {t(lang, 'booking.editBooking')}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {booking.status !== 'CANCELED' ? (
              <button
                onClick={() => setConfirmAction({
                  message: t(lang, 'booking.confirmCancel'),
                  action: () => onUpdateStatus(booking.id!, 'CANCELED'),
                  color: 'bg-amber-500 hover:bg-amber-600',
                })}
                className="py-3 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-amber-600 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Prohibit size={14} weight="bold" /> {t(lang, 'booking.cancelBooking')}
              </button>
            ) : (
              <button
                onClick={() => setConfirmAction({
                  message: t(lang, 'booking.confirmReactivate'),
                  action: () => onUpdateStatus(booking.id!, 'UPCOMING'),
                  color: 'bg-emerald-500 hover:bg-emerald-600',
                })}
                className="py-3 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Check size={14} weight="bold" /> {t(lang, 'booking.reactivate')}
              </button>
            )}
            <button
              onClick={() => setConfirmAction({
                message: t(lang, 'booking.confirmDelete'),
                action: () => onDelete(booking.id!),
              })}
              className="py-3 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Trash size={14} weight="bold" /> {t(lang, 'booking.delete')}
            </button>
          </div>
        </div>
      </div>

      {confirmAction && (
        <ConfirmModal
          message={confirmAction.message}
          confirmColor={confirmAction.color}
          confirmLabel={t(lang, 'booking.yes')}
          cancelLabel={t(lang, 'booking.no')}
          onConfirm={() => { confirmAction.action(); setConfirmAction(null); }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

// ---------- INVOICE MODAL ----------

interface CompanyProfile {
  companyName?: string | null;
  companyAddress?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyTaxId?: string | null;
  companyLogoUrl?: string | null;
  invoiceFooter?: string | null;
}

interface InvoiceModalProps {
  booking: any;
  tenantName: string;
  currency: string;
  lang: Language;
  tz: string;
  dir: 'ltr' | 'rtl';
  onClose: () => void;
  company?: CompanyProfile;
  rooms?: any[];
}

export function InvoiceModal({ booking, tenantName, currency, lang, tz, dir, onClose, company, rooms = [] }: InvoiceModalProps) {
  const roomLabel = rooms.find((r: any) => r.id === booking.room)?.name || booking.room;
  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[200] p-4"
      onClick={onClose}
      dir={dir}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center hide-on-print">
          <h2 className="font-black text-slate-900 uppercase tracking-tight">{t(lang, 'invoice.title')} Preview</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t(lang, 'invoice.close')}
            className="h-10 w-10 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <X size={20} weight="bold" />
          </button>
        </div>
        <div className="p-6 relative overflow-auto max-h-[80vh] bg-white invoice-print-area">
          {booking.status === 'CANCELED' && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-[12px] border-red-500 text-red-500 font-black text-8xl opacity-10 transform -rotate-12 p-8 rounded-2xl uppercase pointer-events-none">
              {t(lang, 'invoice.canceled')}
            </div>
          )}
          <div className="flex justify-between mb-12">
            <div className="space-y-1">
              <h1 className="text-4xl font-black text-emerald-600 tracking-tighter uppercase">{t(lang, 'invoice.title')}</h1>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t(lang, 'invoice.bookingId')}: {booking.bookingNumber != null ? `#${String(booking.bookingNumber).padStart(4, '0')}` : `#${booking.id.slice(0, 8)}`}</p>
              <p className="text-xs font-semibold text-slate-400">
                {t(lang, 'invoice.created')}: {formatTz(parseISO(booking.createdAt), 'dd MMM yyyy', tz, lang)}
              </p>
            </div>
            <div className="text-end">
              {company?.companyLogoUrl && (
                <img src={company.companyLogoUrl} alt="" className="h-12 ms-auto mb-2 object-contain" crossOrigin="anonymous" />
              )}
              <h2 className="text-xl font-black text-slate-900 tracking-tight">{(company?.companyName || tenantName)?.toUpperCase()}</h2>
              {company?.companyAddress && (
                <p className="text-xs font-semibold text-slate-500 mt-1 max-w-[200px] ms-auto whitespace-pre-line">{company.companyAddress}</p>
              )}
              {(company?.companyPhone || company?.companyEmail) && (
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  {company.companyPhone}{company.companyPhone && company.companyEmail && ' · '}{company.companyEmail}
                </p>
              )}
              {company?.companyTaxId && (
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t(lang, 'settings.companyTaxId')}: {company.companyTaxId}</p>
              )}
              {!company?.companyName && (
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Guest Folio</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 mb-12 border-y border-slate-100 py-10">
            <div>
              <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3">{t(lang, 'invoice.guestInfo')}</div>
              <div className="font-black text-2xl text-slate-900 leading-tight mb-1">{booking.guestName}</div>
              <div className="text-sm font-semibold text-slate-500">{booking.city || ''}</div>
              {booking.guestPhone && <div className="text-sm font-bold text-slate-600 mt-2">{booking.guestPhone}</div>}
              {booking.guestIdNumber && (
                <div className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-widest">
                  ID: {booking.guestIdNumber}
                </div>
              )}
            </div>
            <div className="text-end">
              <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3">{t(lang, 'invoice.roomDetails')}</div>
              <div className="font-black text-2xl text-slate-900 leading-tight mb-1">{t(lang, 'list.room')} {roomLabel}</div>
              <div className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-1">{booking.nights} {t(lang, 'invoice.night')}</div>
              <div className="text-sm font-semibold text-slate-500">
                {formatTz(booking.checkIn, 'dd MMM', tz, lang)} {' - '}
                {formatTz(booking.checkOut, 'dd MMM yyyy', tz, lang)}
              </div>
            </div>
          </div>

          <table className="w-full mb-12">
            <thead className="border-b-4 border-slate-900">
              <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                <th className="py-4 text-start">{t(lang, 'invoice.description')}</th>
                <th className="py-4 text-end">{t(lang, 'invoice.priceNight')}</th>
                <th className="py-4 text-end">{t(lang, 'invoice.amount')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="text-slate-700">
                <td className="py-6 font-bold">{t(lang, 'invoice.roomFees')} ({booking.nights} Nights)</td>
                <td className="py-6 text-end font-medium">{currency} {booking.nightPrice}</td>
                <td className="py-6 text-end font-black text-lg text-slate-900">{currency} {booking.totalPrice}</td>
              </tr>
            </tbody>
          </table>

          <div className="ml-auto max-w-xs space-y-3">
            <div className="flex justify-between text-slate-400 font-bold uppercase text-[11px] tracking-widest">
              <span>{t(lang, 'invoice.total')}</span>
              <span className="text-slate-900 font-black">{currency} {booking.totalPrice}</span>
            </div>
            <div className="flex justify-between text-slate-400 font-bold uppercase text-[11px] tracking-widest">
              <span>{t(lang, 'invoice.deposit')}</span>
              <span className="text-slate-900 font-black">{currency} {booking.deposit}</span>
            </div>
            <div className="flex justify-between bg-slate-900 text-white p-4 rounded-2xl items-center">
              <span className="font-black uppercase text-xs tracking-widest">{t(lang, 'invoice.remainingBalance')}</span>
              <span className="text-2xl font-black">{currency} {booking.remaining}</span>
            </div>
          </div>
          {company?.invoiceFooter && (
            <div className="mt-10 pt-6 border-t border-slate-100 text-xs font-semibold text-slate-500 whitespace-pre-line leading-relaxed">
              {company.invoiceFooter}
            </div>
          )}
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 hide-on-print flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 border border-slate-200 rounded-2xl font-bold hover:bg-white transition-all"
          >
            {t(lang, 'invoice.close')}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2"
          >
            <Printer size={20} weight="bold" />
            {t(lang, 'invoice.print')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- IMPORT BOOKINGS MODAL ----------

export function ImportBookingsModal({
  onClose,
  rooms,
  lang,
}: {
  onClose: () => void;
  rooms: any[];
  lang: Language;
}) {
  const [parsed, setParsed] = React.useState<any[]>([]);
  const [stats, setStats] = React.useState<{ total: number; matched: number; unmatched: number } | null>(null);
  const [result, setResult] = React.useState<{ imported: number; skipped: number } | null>(null);
  const [importError, setImportError] = React.useState('');
  const { bulkImport, loading } = useBulkImportBookings();

  // Arabic header → internal field name
  const AR_MAP: Record<string, string> = {
    'الإسم': 'guestName', 'الاسم': 'guestName',
    'تاريخ الحجز': '_bookingDate',
    'طريقة الدفع': 'source',
    'الدخول': 'checkIn',
    'الليالي': 'nights',
    'الخروج': 'checkOut',
    'رقم الشقة': 'room', 'رقم الغرفة': 'room',
    'سعر الليلة': 'nightPrice',
    'دفعة': 'deposit',
    'المتبقي': '_remaining',
    'ملاحظات': 'notes',
  };

  function parseCSV(text: string) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return;
    const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    // Normalise: try Arabic map first, then lowercase English
    const headers = rawHeaders.map(h => AR_MAP[h] || h.toLowerCase().replace(/\s/g, ''));

    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const fields: string[] = [];
      let inQuote = false;
      let current = '';
      for (const char of lines[i]) {
        if (char === '"') { inQuote = !inQuote; }
        else if (char === ',' && !inQuote) { fields.push(current.trim()); current = ''; }
        else { current += char; }
      }
      fields.push(current.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = (fields[idx] ?? '').replace(/^"|"$/g, ''); });
      if (row['guestName']) rows.push(row);
    }

    // Match room names (case-insensitive) → room IDs
    const roomNameMap: Record<string, string> = {};
    rooms.forEach(r => { roomNameMap[r.name.toLowerCase()] = r.id; });

    let matched = 0;
    let unmatched = 0;
    const bookings = rows.map(r => {
      const guestName = r['guestName'] || '';
      const roomRaw = r['room'] || '';
      const roomId = roomNameMap[roomRaw.toLowerCase()];
      if (roomId) matched++; else unmatched++;
      const nightPrice = parseFloat(r['nightPrice'] || '0');
      const deposit = parseFloat(r['deposit'] || '0');
      // checkOut: use column value or compute from checkIn + nights
      let checkOut = r['checkOut'] || '';
      if (!checkOut && r['nights'] && r['checkIn']) {
        const nights = parseInt(r['nights'], 10);
        if (!isNaN(nights) && nights > 0) {
          const d = new Date(r['checkIn']);
          d.setDate(d.getDate() + nights);
          checkOut = d.toISOString().split('T')[0];
        }
      }
      return {
        guestName,
        room: roomId || roomRaw,
        checkIn: r['checkIn'] || '',
        checkOut,
        nightPrice: isNaN(nightPrice) ? 0 : nightPrice,
        deposit: isNaN(deposit) ? 0 : deposit,
        status: r['status'] || 'upcoming',
        ...(r['source'] ? { source: r['source'] } : {}),
        ...(r['notes'] ? { notes: r['notes'] } : {}),
        ...(r['guestEmail'] ? { guestEmail: r['guestEmail'] } : {}),
        ...(r['guestPhone'] ? { guestPhone: r['guestPhone'] } : {}),
        ...(r['city'] ? { city: r['city'] } : {}),
        ...(r['guestIdNumber'] ? { guestIdNumber: r['guestIdNumber'] } : {}),
      };
    });

    setParsed(bookings);
    setStats({ total: rows.length, matched, unmatched });
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setResult(null);
    setImportError('');
    setParsed([]);
    setStats(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => parseCSV(ev.target?.result as string);
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!parsed.length) return;
    try {
      const created = await bulkImport(parsed);
      setResult({ imported: created.length, skipped: parsed.length - created.length });
      setParsed([]);
      setStats(null);
    } catch (e: any) {
      setImportError(e.message || 'Import failed');
    }
  }

  const closeLabel = lang === 'ar' ? 'إغلاق' : lang === 'tr' ? 'Kapat' : 'Close';
  const cancelLabel = lang === 'ar' ? 'إلغاء' : lang === 'tr' ? 'İptal' : 'Cancel';
  const sampleLabel = lang === 'ar' ? 'تنزيل ملف نموذجي' : lang === 'tr' ? 'Örnek İndir' : 'Download sample';

  function downloadSample() {
    const roomName = rooms[0]?.name || 'شقة 1';
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const t1 = new Date(); t1.setDate(t1.getDate() + 2);
    const t2 = new Date(); t2.setDate(t2.getDate() + 5);
    const t3 = new Date(); t3.setDate(t3.getDate() + 7);
    const t4 = new Date(); t4.setDate(t4.getDate() + 10);
    // BOM for Excel Arabic support
    const BOM = '﻿';
    const csv = BOM + [
      'الإسم,تاريخ الحجز,طريقة الدفع,الدخول,الليالي,الخروج,رقم الشقة,سعر الليلة,دفعة,المتبقي,ملاحظات',
      `أحمد الراشدي,${fmt(t1)},كاش,${fmt(t1)},3,${fmt(t2)},${roomName},80,30,210,`,
      `سارة جونسون,${fmt(t3)},تحويل,${fmt(t3)},3,${fmt(t4)},${roomName},80,40,200,طلب تسجيل مبكر`,
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hujuzatk-import-sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="font-black text-slate-900 text-lg">{t(lang, 'import.title')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <p className="text-xs text-slate-500 leading-relaxed font-mono">
              {t(lang, 'import.hint')}
            </p>
            <button
              onClick={downloadSample}
              className="flex items-center gap-2 text-xs font-black text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              <DownloadSimple size={15} weight="bold" />
              {sampleLabel}
            </button>
          </div>

          {!result && (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-8 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all">
              <Upload size={32} className="text-slate-300 mb-3" />
              <span className="text-sm font-black text-slate-600">{t(lang, 'import.selectFile')}</span>
              <span className="text-xs text-slate-400 mt-1">.csv</span>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
            </label>
          )}

          {stats && !result && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm space-y-1.5">
              <p className="font-black text-blue-800">
                {t(lang, 'import.rowsFound').replace('{n}', String(stats.total))}
              </p>
              <p className="text-blue-600">
                {t(lang, 'import.roomsMatched').replace('{n}', String(stats.matched))}
              </p>
              {stats.unmatched > 0 && (
                <p className="text-amber-600">
                  {t(lang, 'import.unmatched').replace('{n}', String(stats.unmatched))}
                </p>
              )}
            </div>
          )}

          {result && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-sm space-y-1.5">
              <p className="font-black text-emerald-800">
                {t(lang, 'import.success').replace('{n}', String(result.imported))}
              </p>
              {result.skipped > 0 && (
                <p className="text-slate-500">
                  {t(lang, 'import.skipped').replace('{n}', String(result.skipped))}
                </p>
              )}
            </div>
          )}

          {importError && (
            <p className="text-sm text-rose-600 bg-rose-50 rounded-xl p-3">{importError}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-black text-slate-600 hover:bg-slate-50 transition-all"
          >
            {result ? closeLabel : cancelLabel}
          </button>
          {!result && parsed.length > 0 && (
            <button
              onClick={handleImport}
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-black uppercase tracking-widest disabled:opacity-50 hover:bg-emerald-700 transition-all active:scale-95"
            >
              {loading ? '…' : t(lang, 'import.doImport')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
