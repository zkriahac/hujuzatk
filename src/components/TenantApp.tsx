import { useEffect, useMemo, useRef, useState } from 'react';
import { format, addMonths, differenceInCalendarDays, differenceInDays, eachMonthOfInterval, endOfMonth, parseISO, startOfMonth, startOfToday } from 'date-fns';
import { authService, type SessionUser } from '../lib/authService';
import { dataService } from '../lib/dataService';
import { getDir, type Language } from '../lib/i18n';
import { t } from '../lib/i18n';
import { cn } from '../utils/cn';
import { formatTz } from '../utils/formatTz';
import { DEFAULT_ROOMS, type View, type ListFilter, getMonthNumber } from '../utils/constants';
import type { Booking } from '../db';
import CalendarView from './CalendarView';
import ListView from './ListView';
import ReportsView from './ReportsView';
import SettingsView from './SettingsView';
import AdminView from './AdminView';
import { AddBookingModal, BookingDetailsModal, InvoiceModal } from './Modals';

interface TenantAppProps {
  session: SessionUser;
  onSessionChange: (s: SessionUser | null) => void;
}

export default function TenantApp({ session, onSessionChange }: TenantAppProps) {
  const lang = (session.tenant.language as Language) || 'en';
  const tz = session.tenant.timezone || 'Asia/Muscat';
  const currency = session.tenant.currency || 'OMR';
  const dir = getDir(lang);

  const [currentView, setCurrentView] = useState<View>(session.isAdmin ? 'admin' : 'calendar');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadedMonths, setLoadedMonths] = useState<Set<string>>(new Set());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalInitialDate, setAddModalInitialDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [addModalInitialRoom, setAddModalInitialRoom] = useState<string>(
    session.tenant.rooms?.[0]?.id ?? DEFAULT_ROOMS[0].id,
  );
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const [reportStartDate, setReportStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [reportEndDate, setReportEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [reportRoomFilter, setReportRoomFilter] = useState<string>('ALL');
  const [reportType, setReportType] = useState<'stay' | 'created'>('stay');

  const [listSearchTerm, setListSearchTerm] = useState('');
  const [listFilter, setListFilter] = useState<ListFilter>('upcoming');
  const [visibleListCount, setVisibleListCount] = useState(30);

  const generateMonthDays = (year: number, month: number): Date[] => {
    const days: Date[] = [];
    const firstDay = startOfMonth(new Date(year, month, 1));
    const lastDay = endOfMonth(new Date(year, month, 1));
    const daysInMonth = differenceInCalendarDays(lastDay, firstDay) + 1;
    for (let i = 0; i < daysInMonth; i++) {
      days.push(new Date(year, month, i + 1));
    }
    return days;
  };

  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const today = startOfMonth(new Date());
    for (let m = -12; m <= 12; m++) {
      const monthDate = addMonths(today, m);
      const monthDays = generateMonthDays(monthDate.getFullYear(), monthDate.getMonth());
      days.push(...monthDays);
    }
    return days;
  }, []);

  const calendarContainerRef = useRef<HTMLDivElement | null>(null);

  const loadMonthBookings = async (date: Date, force: boolean = false) => {
    const monthKey = format(date, 'yyyy-MM');
    if (force || !loadedMonths.has(monthKey)) {
      const startDate = format(startOfMonth(date), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(date), 'yyyy-MM-dd');
      const monthBookings = await dataService.getBookingsByDateRange(startDate, endDate);
      setBookings(prev => {
        const filtered = prev.filter(b => {
          const bookingMonth = format(parseISO(b.checkIn), 'yyyy-MM');
          return bookingMonth !== monthKey;
        });
        return [...filtered, ...monthBookings];
      });
      setLoadedMonths(prev => new Set([...prev, monthKey]));
    }
  };

  useEffect(() => {
    const loadInitialMonths = async () => {
      const now = new Date();
      for (let m = -1; m <= 2; m++) {
        const date = addMonths(now, m);
        await loadMonthBookings(date);
      }
    };
    void loadInitialMonths();
  }, [session.tenantId]);

  useEffect(() => {
    const container = calendarContainerRef.current;
    if (!container) return;
    let scrollTimeout: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const monthHeaders = container.querySelectorAll('td[colSpan]');
        const monthsToLoad = new Set<string>();
        monthHeaders.forEach((header) => {
          const rect = header.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          if (rect.top >= containerRect.top - 200 && rect.top <= containerRect.bottom + 200) {
            const monthText = header.textContent || '';
            const parts = monthText.trim().split(' ');
            if (parts.length === 2) {
              try {
                const monthDate = parseISO(`${parts[1]}-${getMonthNumber(parts[0])}-01`);
                monthsToLoad.add(format(monthDate, 'yyyy-MM'));
                monthsToLoad.add(format(addMonths(monthDate, 1), 'yyyy-MM'));
                monthsToLoad.add(format(addMonths(monthDate, -1), 'yyyy-MM'));
              } catch {}
            }
          }
        });
        monthsToLoad.forEach((monthKey) => {
          try {
            const [year, month] = monthKey.split('-').map(Number);
            loadMonthBookings(new Date(year, month - 1, 1));
          } catch {}
        });
      }, 300);
    };
    container.addEventListener('scroll', onScroll);
    return () => { clearTimeout(scrollTimeout); container.removeEventListener('scroll', onScroll); };
  }, [loadedMonths]);

  useEffect(() => {
    if (currentView === 'calendar' && calendarContainerRef.current) {
      const todayEl = calendarContainerRef.current.querySelector('[data-today="true"]');
      if (todayEl) (todayEl as HTMLElement).scrollIntoView({ block: 'center' });
    }
  }, [currentView]);

  const jumpToToday = () => {
    if (calendarContainerRef.current) {
      const todayEl = calendarContainerRef.current.querySelector('[data-today="true"]');
      if (todayEl) (todayEl as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const rooms = session.tenant.rooms?.length ? session.tenant.rooms : DEFAULT_ROOMS;

  const handleAddBooking = async (newBooking: any) => {
    const bookingInput = {
      guestName: newBooking.guestName,
      guestEmail: newBooking.guestEmail || undefined,
      guestPhone: newBooking.phone || newBooking.guestPhone || '',
      city: newBooking.city || undefined,
      room: newBooking.room,
      checkIn: newBooking.checkIn,
      checkOut: newBooking.checkOut,
      nightPrice: newBooking.nightPrice,
      deposit: newBooking.deposit,
      notes: newBooking.notes || undefined,
      status: 'UPCOMING',
    };
    Object.keys(bookingInput).forEach(key =>
      (bookingInput as any)[key] === undefined && delete (bookingInput as any)[key]
    );
    const created = await dataService.addBooking(bookingInput);
    if (created) setBookings(prev => [...prev.filter(b => b.id !== created.id), created]);
    setShowAddModal(false);
  };

  const handleUpdateBookingStatus = async (id: number | string, status: string) => {
    const updated = await dataService.updateBooking(id, { status });
    if (updated) {
      setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
    } else {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: status.toLowerCase() as any } : b));
    }
    setSelectedBooking(null);
  };

  const handleUpdateBooking = async (id: number | string, updates: any) => {
    const updated = await dataService.updateBooking(id, updates);
    if (updated) setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
    setSelectedBooking(null);
  };

  const handleDeleteBooking = async (id: number | string) => {
    await dataService.deleteBooking(id);
    setBookings(prev => prev.filter(b => b.id !== id));
    setSelectedBooking(null);
  };

  const filteredBookings = useMemo(() => {
    const today = startOfToday();
    let filtered = bookings.filter((b: Booking) => {
      const term = listSearchTerm.toLowerCase();
      return (
        b.guestName.toLowerCase().includes(term) ||
        b.city?.toLowerCase().includes(term) ||
        b.guestPhone?.includes(listSearchTerm)
      );
    });
    if (listFilter !== 'all') {
      filtered = filtered.filter((b: Booking) => {
        if (listFilter === 'canceled') return b.status === 'CANCELED';
        if (b.status === 'CANCELED') return false;
        const checkIn = parseISO(b.checkIn);
        const checkOut = parseISO(b.checkOut);
        if (listFilter === 'upcoming') return checkIn >= today;
        if (listFilter === 'active') return checkIn < today && checkOut > today;
        if (listFilter === 'past') return checkOut <= today;
        return true;
      });
    }
    return filtered.sort((a: Booking, b: Booking) => b.checkIn.localeCompare(a.checkIn));
  }, [bookings, listSearchTerm, listFilter]);

  const visibleBookings = filteredBookings.slice(0, visibleListCount);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = listContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
        setVisibleListCount((prev) => {
          const next = prev + 50;
          return next > filteredBookings.length ? filteredBookings.length : next;
        });
      }
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [filteredBookings.length]);

  useEffect(() => { setVisibleListCount(30); }, [listFilter, listSearchTerm]);

  const reportData = useMemo(() => {
    const filtered = bookings.filter((b: Booking) => {
      if (b.status === 'CANCELED') return false;
      const dateToCompare = reportType === 'stay' ? b.checkIn : b.createdAt.split('T')[0];
      const inRange = dateToCompare >= reportStartDate && dateToCompare <= reportEndDate;
      const roomMatch = reportRoomFilter === 'ALL' || b.room === reportRoomFilter;
      return inRange && roomMatch;
    });

    const roomStats = rooms.map((room) => {
      const roomBookings = filtered.filter((b: Booking) => b.room === room.id);
      const totalNights = roomBookings.reduce((sum: number, b: Booking) => sum + b.nights, 0);
      const totalRevenue = roomBookings.reduce((sum: number, b: Booking) => sum + b.totalPrice, 0);
      const start = parseISO(reportStartDate);
      const end = parseISO(reportEndDate);
      const daysInReport = differenceInDays(end, start) + 1;
      let occupiedDays = 0;
      if (daysInReport > 0) {
        let current = start;
        while (current <= end) {
          const dStr = format(current, 'yyyy-MM-dd');
          const isOccupied = roomBookings.some((b) => dStr >= b.checkIn && dStr < b.checkOut);
          if (isOccupied) occupiedDays++;
          current = new Date(current.getTime() + 86400000);
        }
      }
      const occupancyRate = daysInReport > 0 ? (occupiedDays / daysInReport) * 100 : 0;
      return { roomId: room.id, totalNights, totalRevenue, occupancyRate };
    });

    const totalRevenue = filtered.reduce((sum: number, b: Booking) => sum + b.totalPrice, 0);
    const totalNights = filtered.reduce((sum: number, b: Booking) => sum + b.nights, 0);

    const months = eachMonthOfInterval({ start: parseISO(reportStartDate), end: parseISO(reportEndDate) });
    const monthlyStats = months.map((month) => {
      const monthEnd = format(endOfMonth(month), 'yyyy-MM-dd');
      const realStart = format(startOfMonth(month), 'yyyy-MM-dd');
      const monthBookings = bookings.filter(
        (b) =>
          b.status !== 'CANCELED' &&
          b.checkIn <= monthEnd &&
          b.checkOut > realStart &&
          (reportRoomFilter === 'ALL' || b.room === reportRoomFilter),
      );
      const revenue = monthBookings.reduce((sum, b) => {
        return b.checkIn >= realStart && b.checkIn <= monthEnd ? sum + b.totalPrice : sum;
      }, 0);
      const occupancy = monthBookings.reduce((sum, b) => {
        const s = b.checkIn < realStart ? parseISO(realStart) : parseISO(b.checkIn);
        const e = b.checkOut > monthEnd ? parseISO(monthEnd) : parseISO(b.checkOut);
        const days = differenceInDays(e, s);
        return sum + Math.max(0, days);
      }, 0);
      const totalPossibleNights = differenceInDays(parseISO(monthEnd), parseISO(realStart)) + 1;
      const totalRooms = reportRoomFilter === 'ALL' ? rooms.length : 1;
      const fillRate = totalPossibleNights > 0 ? (occupancy / (totalPossibleNights * totalRooms)) * 100 : 0;
      return { month: formatTz(month, 'MMM yyyy', tz, lang), revenue, fillRate };
    });

    return { roomStats, totalRevenue, totalNights, bookingCount: filtered.length, monthlyStats };
  }, [bookings, reportStartDate, reportEndDate, reportRoomFilter, reportType, rooms, tz, lang]);

  const handleLogout = async () => {
    await authService.logout();
    onSessionChange(null);
    window.location.href = '/';
  };

  const subscriptionBadge = (() => {
    const status = session.tenant.subscriptionStatus;
    const validUntil = session.tenant.validUntil;
    const label = t(lang, `status.${status}`);
    const color =
      status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
      status === 'TRIAL'  ? 'bg-blue-100 text-blue-700' :
      status === 'EXPIRED' ? 'bg-amber-100 text-amber-700' :
      'bg-red-100 text-red-700';
    return (
      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-black mr-2 uppercase', color)}>
        {label}
        {validUntil && ` • ${t(lang, 'admin.validUntil')} ${formatTz(validUntil, 'yyyy-MM-dd', tz, lang)}`}
      </span>
    );
  })();

  return (
    <div className={cn('min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-100', dir === 'rtl' && 'rtl')} dir={dir}>
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-[100] h-14 backdrop-blur-xl bg-white/80">
        <div className="max-w-full mx-auto px-3 sm:px-6 flex justify-between h-full items-center gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-100">
              <div className="flex items-center justify-center w-full h-full rounded-xl">
                <img src="/logo.svg" alt="Plus Logo" style={{ width: 40, height: 40 }} />
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-black text-sm tracking-tight truncate max-w-[120px] sm:max-w-none">{session.tenant.name || 'Hujuzatk Workspace'}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter hidden sm:block">{t(lang, 'misc.projectname')} PMS</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden lg:flex items-center gap-2 text-xs">
              {session.isAdmin ? '' : subscriptionBadge}
            </div>
            <button
              onClick={handleLogout}
              className="text-[11px] font-black uppercase text-slate-400 hover:text-red-600 transition-colors whitespace-nowrap"
            >
              {t(lang, 'misc.logout')}
            </button>
          </div>
        </div>
      </nav>

      <div className="bg-white border-b border-slate-200 sticky top-14 z-[90] h-10 overflow-x-auto overflow-y-hidden">
        <div className="container mx-auto px-3 sm:px-6 flex h-full items-center gap-1 scrollbar-hide">
          {(session.isAdmin ? ['admin'] as View[] : ['calendar', 'list', 'reports', 'settings'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setCurrentView(v)}
              className={cn(
                'px-4 h-full text-xs font-black uppercase tracking-widest transition-all border-b-2',
                currentView === v ? 'border-emerald-600 text-emerald-600 bg-emerald-50/30' : 'border-transparent text-slate-400 hover:text-slate-600'
              )}
            >
              {t(lang, `nav.${v}`)}
            </button>
          ))}
        </div>
      </div>

      <main className="container mx-auto p-4 pt-4">
        {currentView === 'calendar' && (
          <CalendarView
            rooms={rooms}
            bookings={bookings}
            selectedDateStr={selectedDateStr}
            setSelectedDateStr={setSelectedDateStr}
            calendarDays={calendarDays}
            calendarContainerRef={calendarContainerRef}
            setShowAddModal={setShowAddModal}
            setAddModalInitialDate={setAddModalInitialDate}
            setAddModalInitialRoom={setAddModalInitialRoom}
            setSelectedBooking={setSelectedBooking}
            jumpToToday={jumpToToday}
            lang={lang}
            tz={tz}
          />
        )}
        {currentView === 'list' && (
          <ListView
            bookings={visibleBookings}
            fullFiltered={filteredBookings}
            visibleCount={visibleListCount}
            totalCount={filteredBookings.length}
            onLoadMore={() => setVisibleListCount(prev => prev + 50)}
            listFilter={listFilter}
            setListFilter={setListFilter}
            listSearchTerm={listSearchTerm}
            setListSearchTerm={setListSearchTerm}
            setShowAddModal={setShowAddModal}
            setSelectedBooking={setSelectedBooking}
            setShowInvoiceModal={setShowInvoiceModal}
            listContainerRef={listContainerRef}
            currency={currency}
            lang={lang}
            tz={tz}
          />
        )}
        {currentView === 'reports' && (
          <ReportsView
            rooms={rooms}
            reportType={reportType}
            setReportType={setReportType}
            reportStartDate={reportStartDate}
            reportEndDate={reportEndDate}
            setReportStartDate={setReportStartDate}
            setReportEndDate={setReportEndDate}
            reportRoomFilter={reportRoomFilter}
            setReportRoomFilter={setReportRoomFilter}
            reportData={reportData}
            currency={currency}
            lang={lang}
          />
        )}
        {currentView === 'settings' && (
          <SettingsView session={session} onSessionChange={onSessionChange} lang={lang} />
        )}
        {currentView === 'admin' && session.isAdmin && (
          <AdminView lang={lang} tz={tz} />
        )}
      </main>

      {showAddModal && (
        <AddBookingModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddBooking}
          initialDate={addModalInitialDate}
          initialRoom={addModalInitialRoom}
          rooms={rooms}
          currency={currency}
          lang={lang}
        />
      )}

      {selectedBooking && !showInvoiceModal && (
        <BookingDetailsModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onDelete={handleDeleteBooking}
          onUpdateStatus={handleUpdateBookingStatus}
          onUpdate={handleUpdateBooking}
          onPrintInvoice={() => setShowInvoiceModal(true)}
          currency={currency}
          lang={lang}
          tz={tz}
          rooms={rooms}
        />
      )}

      {showInvoiceModal && selectedBooking && (
        <InvoiceModal
          booking={selectedBooking}
          tenantName={session.tenant.name || ''}
          currency={currency}
          lang={lang}
          tz={tz}
          dir={dir}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}
    </div>
  );
}
