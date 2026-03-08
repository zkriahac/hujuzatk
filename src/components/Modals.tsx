import React, { useEffect, useRef, useState } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import {
  X, Sparkle, Users, Minus, Plus, CreditCard, FileText,
  PencilSimple, Prohibit, Trash, Check,
} from 'phosphor-react';
import { cn } from '../utils/cn';
import { t, type Language } from '../lib/i18n';
import { formatTz } from '../utils/formatTz';

// ---------- ADD BOOKING MODAL ----------

interface AddBookingModalProps {
  onClose: () => void;
  onAdd: (booking: any) => void;
  initialDate: string;
  initialRoom: string;
  rooms: any[];
  currency: string;
  lang: Language;
}

export function AddBookingModal({ onClose, onAdd, initialDate, initialRoom, rooms, currency, lang }: AddBookingModalProps) {
  const guestNameInputRef = useRef<HTMLInputElement>(null);
  const [nameError, setNameError] = useState(false);

  const [f, setF] = useState({
    guestName: '',
    city: '',
    phone: '',
    checkIn: initialDate,
    nights: 1,
    room: initialRoom,
    nightPrice: 20,
    deposit: 0,
  });

  useEffect(() => {
    guestNameInputRef.current?.focus();
  }, []);

  const checkOut = format(addDays(parseISO(f.checkIn), Math.max(1, f.nights)), 'yyyy-MM-dd');
  const totalPrice = Math.max(1, f.nights) * f.nightPrice;
  const remaining = totalPrice - f.deposit;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.guestName.trim()) {
      setNameError(true);
      guestNameInputRef.current?.focus();
      return;
    }
    onAdd({ guestName: f.guestName, city: f.city, phone: f.phone, room: f.room, checkIn: f.checkIn, checkOut, nightPrice: f.nightPrice, deposit: f.deposit });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <form onSubmit={handleSubmit} dir={lang === 'ar' ? 'rtl' : 'ltr'} className="relative bg-white rounded-[2.5rem] max-w-lg w-full p-10 shadow-3xl">
        <button type="button" onClick={onClose} className="absolute top-5 end-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
          <X size={20} weight="bold" />
        </button>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-8 flex items-center gap-3">
          <Sparkle size={32} className="text-emerald-500" weight="fill" />
          {t(lang, 'booking.addTitle')}
        </h2>
        <div className="space-y-5">
          <div className="relative group">
            <div className={cn('absolute inset-y-0 flex items-center pointer-events-none text-slate-300 group-focus-within:text-emerald-500 transition-colors', lang === 'ar' ? 'right-4' : 'left-4')}>
              <Users size={18} weight="bold" />
            </div>
            <input
              ref={guestNameInputRef}
              className={cn(
                'w-full bg-slate-50 rounded-2xl py-3 text-sm font-bold focus:ring-2 transition-all',
                lang === 'ar' ? 'pr-11 pl-4' : 'pl-11 pr-4',
                nameError ? 'ring-2 ring-red-400 border-red-300 focus:ring-red-400' : 'border-slate-100 focus:ring-emerald-500'
              )}
              placeholder={t(lang, 'booking.guestName')}
              value={f.guestName}
              onChange={(e) => { setF({ ...f, guestName: e.target.value }); if (nameError) setNameError(false); }}
            />
          </div>
          <div className="flex gap-4">
            <input
              className="w-1/2 bg-slate-50 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
              placeholder={t(lang, 'booking.city')}
              value={f.city}
              onChange={(e) => setF({ ...f, city: e.target.value })}
            />
            <input
              className="w-1/2 bg-slate-50 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
              placeholder={t(lang, 'booking.phone')}
              value={f.phone}
              onChange={(e) => setF({ ...f, phone: e.target.value })}
            />
          </div>
          <div className="flex gap-4">
            <div className="w-1/2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block px-2">
                {t(lang, 'booking.checkIn')}
              </label>
              <input
                type="date"
                className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-emerald-500 transition-all"
                value={f.checkIn}
                onChange={(e) => setF({ ...f, checkIn: e.target.value })}
              />
            </div>
            <div className="w-1/2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block px-2">
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
                  className="px-4 py-3.5 text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition-colors active:bg-slate-300">
                  <Minus size={18} weight="bold" />
                </button>
                <span className="flex-1 text-center text-sm font-black text-slate-900 tabular-nums">{f.nights}</span>
                <button type="button" onClick={() => setF({ ...f, nights: f.nights + 1 })}
                  className="px-4 py-3.5 text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition-colors active:bg-slate-300">
                  <Plus size={18} weight="bold" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-1/2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block px-2">
                {t(lang, 'booking.room')}
              </label>
              <select
                className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-emerald-500 transition-all"
                value={f.room}
                onChange={(e) => setF({ ...f, room: e.target.value })}
              >
                {rooms.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="w-1/2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block px-2">
                {t(lang, 'booking.priceNight')}
              </label>
              <div className="relative">
                <div className={cn('absolute inset-y-0 flex items-center pointer-events-none text-slate-300 text-[10px] font-black uppercase', lang === 'ar' ? 'right-4' : 'left-4')}>{currency}</div>
                <input
                  type="number"
                  className={cn('w-full bg-slate-50 border-slate-100 rounded-2xl py-3 text-sm font-black focus:ring-2 focus:ring-emerald-500 transition-all', lang === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4')}
                  value={f.nightPrice}
                  onChange={(e) => setF({ ...f, nightPrice: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-[2rem] p-6 text-white mt-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-all">
              <CreditCard size={100} weight="duotone" />
            </div>
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">{t(lang, 'booking.total')}</p>
                <p className="text-2xl font-black">{currency} {totalPrice}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">{t(lang, 'booking.deposit')}</p>
                <input
                  type="number"
                  className="w-full bg-slate-800/50 border-0 rounded-xl px-3 py-1 text-lg font-black focus:ring-1 focus:ring-emerald-500 transition-all"
                  value={f.deposit}
                  onChange={(e) => setF({ ...f, deposit: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-2 pt-4 border-t border-slate-800 flex justify-between items-center">
                <p className="text-xs font-black uppercase tracking-widest text-emerald-400">{t(lang, 'booking.remaining')}</p>
                <p className="text-3xl font-black text-white">{currency} {remaining}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-10 flex gap-4">
          <button type="button" onClick={onClose} className="flex-1 py-4 border-2 border-slate-200 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition-all">
            {t(lang, 'booking.cancel')}
          </button>
          <button
            type="submit"
            className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-50 hover:bg-emerald-700 transition-all active:scale-95"
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
}

export function BookingDetailsModal({
  booking, onClose, onDelete, onPrintInvoice, onUpdateStatus, onUpdate,
  currency, lang, tz, rooms,
}: BookingDetailsModalProps) {
  const [editMode, setEditMode] = useState(false);

  const nightsFromBooking = Math.round(
    (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000
  ) || 1;

  const [f, setF] = useState({
    guestName: booking.guestName || '',
    city: booking.city || '',
    phone: booking.guestPhone || '',
    room: booking.room || '',
    checkIn: booking.checkIn ? booking.checkIn.split('T')[0] : '',
    nights: nightsFromBooking,
    nightPrice: booking.nightPrice || 0,
    deposit: booking.deposit || 0,
  });

  const checkOut = format(addDays(parseISO(f.checkIn), Math.max(1, f.nights)), 'yyyy-MM-dd');
  const totalPrice = Math.max(1, f.nights) * f.nightPrice;
  const remaining = totalPrice - f.deposit;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.guestName.trim()) return;
    onUpdate(booking.id!, {
      guestName: f.guestName,
      city: f.city,
      guestPhone: f.phone,
      room: f.room,
      checkIn: f.checkIn,
      checkOut,
      nightPrice: f.nightPrice,
      deposit: f.deposit,
    });
  };

  if (editMode) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
        <form onSubmit={handleSave} dir={lang === 'ar' ? 'rtl' : 'ltr'} className="relative bg-white rounded-[2.5rem] max-w-lg w-full p-10 shadow-3xl max-h-[90vh] overflow-y-auto">
          <button type="button" onClick={() => setEditMode(false)} className="absolute top-5 end-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
            <X size={20} weight="bold" />
          </button>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-8">{t(lang, 'booking.editTitle')}</h2>
          <div className="space-y-4">
            <input
              className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
              placeholder={t(lang, 'booking.guestName')}
              value={f.guestName}
              onChange={(e) => setF({ ...f, guestName: e.target.value })}
            />
            <div className="flex gap-4">
              <input
                className="w-1/2 bg-slate-50 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder={t(lang, 'booking.city')}
                value={f.city}
                onChange={(e) => setF({ ...f, city: e.target.value })}
              />
              <input
                className="w-1/2 bg-slate-50 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder={t(lang, 'booking.phone')}
                value={f.phone}
                onChange={(e) => setF({ ...f, phone: e.target.value })}
              />
            </div>
            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block px-2">{t(lang, 'booking.checkIn')}</label>
                <input
                  type="date"
                  className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-emerald-500 transition-all"
                  value={f.checkIn}
                  onChange={(e) => setF({ ...f, checkIn: e.target.value })}
                />
              </div>
              <div className="w-1/2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block px-2">{t(lang, 'booking.nights')}</label>
                <div
                  className="flex items-center bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden select-none"
                  onWheel={(e) => setF({ ...f, nights: Math.max(1, f.nights + (e.deltaY < 0 ? 1 : -1)) })}
                >
                  <button type="button" onClick={() => setF({ ...f, nights: Math.max(1, f.nights - 1) })}
                    className="px-4 py-3.5 text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition-colors">
                    <Minus size={18} weight="bold" />
                  </button>
                  <span className="flex-1 text-center text-sm font-black text-slate-900 tabular-nums">{f.nights}</span>
                  <button type="button" onClick={() => setF({ ...f, nights: f.nights + 1 })}
                    className="px-4 py-3.5 text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition-colors">
                    <Plus size={18} weight="bold" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block px-2">{t(lang, 'booking.room')}</label>
                <select
                  className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-2 text-sm font-black focus:ring-2 focus:ring-emerald-500 transition-all"
                  value={f.room}
                  onChange={(e) => setF({ ...f, room: e.target.value })}
                >
                  {(rooms || []).map((r: any) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-1/2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block px-2">{t(lang, 'booking.priceNight')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-300 text-[10px] font-black uppercase">{currency}</div>
                  <input
                    type="number"
                    className="w-full bg-slate-50 border-slate-100 rounded-2xl pl-12 pr-4 py-3 text-sm font-black focus:ring-2 focus:ring-emerald-500 transition-all"
                    value={f.nightPrice}
                    onChange={(e) => setF({ ...f, nightPrice: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
            <div className="bg-slate-900 rounded-[2rem] p-6 text-white">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">{t(lang, 'booking.total')}</p>
                  <p className="text-2xl font-black">{currency} {totalPrice}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">{t(lang, 'booking.deposit')}</p>
                  <input
                    type="number"
                    className="w-full bg-slate-800/50 border-0 rounded-xl px-3 py-1 text-lg font-black focus:ring-1 focus:ring-emerald-500 transition-all"
                    value={f.deposit}
                    onChange={(e) => setF({ ...f, deposit: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-span-2 pt-4 border-t border-slate-800 flex justify-between items-center">
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-400">{t(lang, 'booking.remaining')}</p>
                  <p className="text-3xl font-black">{currency} {remaining}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 flex gap-4">
            <button type="button" onClick={() => setEditMode(false)}
              className="flex-1 py-4 border-2 border-slate-200 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition-all">
              {t(lang, 'booking.cancel')}
            </button>
            <button type="submit"
              className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-50 hover:bg-emerald-700 transition-all active:scale-95">
              {t(lang, 'booking.save')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="relative bg-white rounded-[2.5rem] max-w-sm w-full p-10 shadow-3xl">
        <button type="button" onClick={onClose} className="absolute top-5 end-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
          <X size={20} weight="bold" />
        </button>
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">{booking.guestName}</h2>
            <div className="flex gap-2 items-center">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-slate-100 rounded text-slate-500">
                {t(lang, 'list.room')} {booking.room}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
                {booking.nights} {t(lang, 'list.nights')}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6 mb-10">
          <div className="grid grid-cols-2 gap-8 py-6 border-y border-slate-50">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-2">{t(lang, 'booking.checkIn')}</p>
              <p className="font-black text-slate-700 uppercase tracking-tighter">{formatTz(booking.checkIn, 'dd MMM yyyy', tz, lang)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-2">{t(lang, 'booking.checkOut').replace(' (auto)', '')}</p>
              <p className="font-black text-slate-700 uppercase tracking-tighter">{formatTz(booking.checkOut, 'dd MMM yyyy', tz, lang)}</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-3xl p-6 space-y-3">
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
                onClick={() => {
                  if (confirm(t(lang, 'booking.confirmCancel'))) onUpdateStatus(booking.id!, 'CANCELED');
                }}
                className="py-3 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-amber-600 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Prohibit size={14} weight="bold" /> {t(lang, 'booking.cancelBooking')}
              </button>
            ) : (
              <button
                onClick={() => {
                  if (confirm(t(lang, 'booking.confirmReactivate'))) onUpdateStatus(booking.id!, 'UPCOMING');
                }}
                className="py-3 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Check size={14} weight="bold" /> {t(lang, 'booking.reactivate')}
              </button>
            )}
            <button
              onClick={() => {
                if (confirm(t(lang, 'booking.confirmDelete'))) onDelete(booking.id!);
              }}
              className="py-3 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Trash size={14} weight="bold" /> {t(lang, 'booking.delete')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- INVOICE MODAL ----------

interface InvoiceModalProps {
  booking: any;
  tenantName: string;
  currency: string;
  lang: Language;
  tz: string;
  dir: 'ltr' | 'rtl';
  onClose: () => void;
}

export function InvoiceModal({ booking, tenantName, currency, lang, tz, dir, onClose }: InvoiceModalProps) {
  const invoiceRef = useRef<HTMLDivElement | null>(null);

  const printInvoice = () => {
    if (!invoiceRef.current) return;
    const content = invoiceRef.current.innerHTML;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(
      `<html><head><title>Invoice</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}.text-right{text-align:right}.bg-gray-100{background:#f3f4f6}</style></head><body dir="${dir}">${content}</body></html>`
    );
    win.document.close();
    win.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden" ref={invoiceRef}>
        <div className="p-6 border-b border-slate-100 flex justify-between items-center hide-on-print">
          <h2 className="font-black text-slate-900 uppercase tracking-tight">{t(lang, 'invoice.title')} Preview</h2>
          <button onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-slate-100">×</button>
        </div>
        <div className="p-12 relative overflow-auto max-h-[80vh]">
          {booking.status === 'CANCELED' && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-[12px] border-red-500 text-red-500 font-black text-8xl opacity-10 transform -rotate-12 p-8 rounded-3xl uppercase pointer-events-none">
              {t(lang, 'invoice.canceled')}
            </div>
          )}
          <div className="flex justify-between mb-12">
            <div className="space-y-1">
              <h1 className="text-4xl font-black text-emerald-600 tracking-tighter uppercase">{t(lang, 'invoice.title')}</h1>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t(lang, 'invoice.bookingId')}: #{booking.id}</p>
              <p className="text-xs font-semibold text-slate-400">
                {t(lang, 'invoice.created')}: {formatTz(parseISO(booking.createdAt), 'dd MMM yyyy', tz, lang)}
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">{tenantName?.toUpperCase()}</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Guest Folio</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 mb-12 border-y border-slate-100 py-10">
            <div>
              <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3">{t(lang, 'invoice.guestInfo')}</div>
              <div className="font-black text-2xl text-slate-900 leading-tight mb-1">{booking.guestName}</div>
              <div className="text-sm font-semibold text-slate-500">{booking.city || ''}</div>
              <div className="text-sm font-bold text-slate-600 mt-2">{booking.guestPhone}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3">{t(lang, 'invoice.roomDetails')}</div>
              <div className="font-black text-2xl text-slate-900 leading-tight mb-1">{t(lang, 'list.room')} {booking.room}</div>
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
                <th className="py-4 text-left">{t(lang, 'invoice.description')}</th>
                <th className="py-4 text-right">{t(lang, 'invoice.priceNight')}</th>
                <th className="py-4 text-right">{t(lang, 'invoice.amount')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="text-slate-700">
                <td className="py-6 font-bold">{t(lang, 'invoice.roomFees')} ({booking.nights} Nights)</td>
                <td className="py-6 text-right font-medium">{currency} {booking.nightPrice}</td>
                <td className="py-6 text-right font-black text-lg text-slate-900">{currency} {booking.totalPrice}</td>
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
        </div>
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 hide-on-print">
          <button onClick={onClose} className="px-6 py-3 border border-slate-200 rounded-2xl font-bold hover:bg-white transition-all">
            {t(lang, 'invoice.close')}
          </button>
          <button onClick={printInvoice} className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2">
            <FileText size={20} weight="bold" /> {t(lang, 'invoice.print')}
          </button>
        </div>
      </div>
    </div>
  );
}
