import { useEffect, useMemo, useRef, useState } from 'react';
import { format, addMonths, differenceInCalendarDays, differenceInDays, eachMonthOfInterval, endOfMonth, parseISO, startOfMonth } from 'date-fns';
import { CaretDown, CalendarBlank, ListBullets, ChartPie, GearSix, ShieldCheck, ArrowsClockwise, CurrencyCircleDollar } from 'phosphor-react';
import { authService, type SessionUser } from '../lib/authService';
import { dataService } from '../lib/dataService';
import { trackLogout, trackBookingCreated, trackBookingCanceled, trackViewChange } from '../lib/analytics';
import { getDir, type Language } from '../lib/i18n';
import { t } from '../lib/i18n';
import { cn } from '../utils/cn';
import { formatTz } from '../utils/formatTz';
import { DEFAULT_ROOMS, type View, type ListFilter, getMonthNumber, getEffectiveStatus } from '../utils/constants';
import type { Booking } from '../db';
import CalendarView from './CalendarView';
import ListView from './ListView';
import ReportsView from './ReportsView';
import SettingsView from './SettingsView';
import AdminView from './AdminView';
import IntegrationsView from './IntegrationsView';
import ExpenseView from './ExpenseView';
import AccountSwitcher from './AccountSwitcher';
import OnboardingTour, { type OnboardingStep } from './OnboardingTour';
import { apolloClient } from '../lib/apolloClient';
import { COMPLETE_ONBOARDING_MUTATION } from '../lib/graphql';
import { AddBookingModal, BookingDetailsModal, InvoiceModal } from './Modals';

const ONBOARDING_LOCAL_KEY = 'hujuzatk_onboarded_local';

interface TenantAppProps {
  session: SessionUser;
  onSessionChange: (s: SessionUser | null) => void;
}

export default function TenantApp({ session, onSessionChange }: TenantAppProps) {
  const lang = (session.tenant.language as Language) || 'en';
  const tz = session.tenant.timezone || 'Asia/Muscat';
  const currency = session.tenant.currency || 'OMR';
  const dir = getDir(lang);
  const isRtl = dir === 'rtl';

  const [currentView, setCurrentView] = useState<View>(session.isAdmin ? 'admin' : 'calendar');
  const [showViewMenu, setShowViewMenu] = useState(false);

  // If admin disables integrations while tenant is on that view, bounce them to Calendar.
  useEffect(() => {
    if (currentView === 'integrations' && session.tenant.integrationsEnabled === false) {
      setCurrentView('calendar');
    }
  }, [session.tenant.integrationsEnabled, currentView]);

  // Onboarding tour — fires once for a new tenant that has not completed it.
  const [showTour, setShowTour] = useState(false);
  useEffect(() => {
    if (session.isAdmin) return;
    if (session.tenant.onboardedAt) return;
    try {
      if (localStorage.getItem(ONBOARDING_LOCAL_KEY) === '1') return;
    } catch {}
    // Small delay so nav/calendar finish mounting and data-tour targets exist
    const timer = setTimeout(() => setShowTour(true), 700);
    return () => clearTimeout(timer);
  }, [session.isAdmin, session.tenant.onboardedAt]);

  const tourSteps: OnboardingStep[] = useMemo(() => {
    const steps: OnboardingStep[] = [
      { targetSelector: '[data-tour="view-switcher"]', titleKey: 'onboarding.step1_title', bodyKey: 'onboarding.step1_desc' },
      { targetSelector: '[data-tour="nav-settings"]', titleKey: 'onboarding.step2_title', bodyKey: 'onboarding.step2_desc' },
    ];
    if (session.tenant.integrationsEnabled !== false) {
      steps.push({ targetSelector: '[data-tour="nav-integrations"]', titleKey: 'onboarding.step3_title', bodyKey: 'onboarding.step3_desc' });
    }
    steps.push({ targetSelector: '[data-tour="new-booking"]', titleKey: 'onboarding.step4_title', bodyKey: 'onboarding.step4_desc' });
    steps.push({ targetSelector: null, titleKey: 'onboarding.final_title', bodyKey: 'onboarding.final_desc' });
    return steps;
  }, [session.tenant.integrationsEnabled]);

  const finishTour = async () => {
    setShowTour(false);
    try { localStorage.setItem(ONBOARDING_LOCAL_KEY, '1'); } catch {}
    // Optimistic session update
    onSessionChange({ ...session, tenant: { ...session.tenant, onboardedAt: new Date().toISOString() } });
    // Persist to backend (best-effort; localStorage is the safety net)
    try { await apolloClient.mutate({ mutation: COMPLETE_ONBOARDING_MUTATION }); } catch {}
    // Restore normal nav state
    setShowViewMenu(false);
  };

  const handleTourStepChange = (_idx: number, step: OnboardingStep) => {
    // Steps targeting items inside the view-switcher dropdown need it open.
    const needsMenu = step.targetSelector === '[data-tour="nav-settings"]'
      || step.targetSelector === '[data-tour="nav-integrations"]';
    setShowViewMenu(needsMenu);
    // Step 4 requires Calendar view so the "+ New Booking" button exists
    if (step.targetSelector === '[data-tour="new-booking"]') {
      setCurrentView('calendar');
    }
  };
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
  // Modal anchor — viewport x/y of the calendar cell the user clicked. Modals open near it
  // instead of centered, so users keep spatial context for what they just touched.
  const [modalAnchor, setModalAnchor] = useState<{ x: number; y: number } | null>(null);

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

  const [calRange, setCalRange] = useState({ before: 6, after: 6 });

  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const today = startOfMonth(new Date());
    for (let m = -calRange.before; m <= calRange.after; m++) {
      const monthDate = addMonths(today, m);
      const monthDays = generateMonthDays(monthDate.getFullYear(), monthDate.getMonth());
      days.push(...monthDays);
    }
    return days;
  }, [calRange]);

  const loadMorePast = async () => {
    const container = calendarContainerRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;
    const prevScrollTop = container?.scrollTop || 0;
    const newBefore = calRange.before + 6;
    // Load bookings for the new months
    const today = startOfMonth(new Date());
    for (let m = -newBefore; m < -calRange.before; m++) {
      await loadMonthBookings(addMonths(today, m));
    }
    setCalRange(prev => ({ ...prev, before: newBefore }));
    // Restore scroll position after React re-renders
    requestAnimationFrame(() => {
      if (container) {
        const newScrollHeight = container.scrollHeight;
        container.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
      }
    });
  };

  const loadMoreFuture = async () => {
    const newAfter = calRange.after + 6;
    const today = startOfMonth(new Date());
    for (let m = calRange.after + 1; m <= newAfter; m++) {
      await loadMonthBookings(addMonths(today, m));
    }
    setCalRange(prev => ({ ...prev, after: newAfter }));
  };

  const calendarContainerRef = useRef<HTMLDivElement | null>(null);

  const loadMonthBookings = async (date: Date, force: boolean = false) => {
    const monthKey = format(date, 'yyyy-MM');
    if (force || !loadedMonths.has(monthKey)) {
      const startDate = format(startOfMonth(date), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(date), 'yyyy-MM-dd');
      const monthBookings = await dataService.getBookingsByDateRange(startDate, endDate);
      setBookings(prev => {
        const newIds = new Set(monthBookings.map((b: any) => b.id));
        const filtered = prev.filter(b => !newIds.has(b.id));
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
      source: newBooking.source || undefined,
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
    if (created) {
      setBookings(prev => [...prev.filter(b => b.id !== created.id), created]);
      trackBookingCreated({ room: created.room, nights: created.nights, totalPrice: created.totalPrice, currency });
    }
    setShowAddModal(false);
  };

  const handleUpdateBookingStatus = async (id: number | string, status: string) => {
    if (status === 'CANCELED') trackBookingCanceled(String(id));
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
    let filtered = bookings.filter((b: Booking) => {
      const term = listSearchTerm.toLowerCase();
      return (
        b.guestName.toLowerCase().includes(term) ||
        b.city?.toLowerCase().includes(term) ||
        b.guestPhone?.includes(listSearchTerm)
      );
    });
    if (listFilter !== 'all') {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      filtered = filtered.filter((b: Booking) => {
        const effective = getEffectiveStatus(b);
        if (listFilter === 'canceled') return effective === 'CANCELED';
        if (effective === 'CANCELED') return false;
        if (listFilter === 'today_checkin')  return b.checkIn.split('T')[0]  === todayStr;
        if (listFilter === 'today_checkout') return b.checkOut.split('T')[0] === todayStr;
        if (listFilter === 'upcoming') return effective === 'UPCOMING';
        if (listFilter === 'active') return effective === 'ACTIVE';
        if (listFilter === 'past') return effective === 'COMPLETED' || effective === 'NO_SHOW';
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
      return { roomId: room.id, roomName: room.name, totalNights, totalRevenue, occupancyRate };
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
    trackLogout();
    await authService.logout();
    onSessionChange(null);
    window.location.href = '/';
  };

  // Subscription badge — visible on every viewport size. Within 7 days of expiry it
  // turns amber and shows "Expires in N days"; expired turns red.
  const daysUntilExpiry = session.tenant.validUntil
    ? Math.ceil((new Date(session.tenant.validUntil).getTime() - Date.now()) / 86400000)
    : null;
  const isExpiring = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
  const subscriptionBadge = (() => {
    const status = session.tenant.subscriptionStatus;
    const validUntil = session.tenant.validUntil;
    const label = t(lang, `status.${status.toLowerCase()}`);
    const color =
      isExpired ? 'bg-red-100 text-red-700' :
      isExpiring ? 'bg-amber-100 text-amber-700' :
      status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
      status === 'TRIAL'  ? 'bg-blue-100 text-blue-700' :
      'bg-slate-100 text-slate-600';
    const dot = isExpired ? 'bg-red-500' : isExpiring ? 'bg-amber-500' : status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-blue-500';
    const detailText = isExpiring && daysUntilExpiry !== null
      ? ` • ${daysUntilExpiry === 0 ? 'today' : `${daysUntilExpiry}d`}`
      : isExpired ? ` • expired`
      : validUntil ? ` • ${formatTz(validUntil, 'yyyy-MM-dd', tz, lang)}`
      : '';
    return (
      <span className={cn('inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-black uppercase mx-2', color)}>
        <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />
        <span className="hidden sm:inline">{label}{detailText}</span>
        <span className="sm:hidden">{isExpiring ? `${daysUntilExpiry}d` : label}</span>
      </span>
    );
  })();

  return (
    <div className={cn('bg-slate-50 text-slate-900 font-sans selection:bg-emerald-100', currentView === 'calendar' ? 'fixed inset-0 flex flex-col overflow-hidden' : 'min-h-screen', dir === 'rtl' && 'rtl')} dir={dir}>
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-100 h-12 sm:h-14">
        <div className="px-3 sm:px-6 flex justify-between h-full items-center gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img src="/logo.svg" alt="Logo" className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" />
            <span className="font-black text-sm tracking-tight truncate max-w-[100px] sm:max-w-none">{session.tenant.name || 'Hujuzatk'}</span>
            {!session.isAdmin && subscriptionBadge}
            {!session.isAdmin && (
              <AccountSwitcher
                lang={lang}
                isRtl={isRtl}
                currentTenantId={session.tenantId}
                currentName={session.tenant.name}
              />
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="relative">
              <button
                onClick={() => setShowViewMenu(v => !v)}
                data-tour="view-switcher"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] sm:text-[11px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors"
              >
                {(() => { const I = { calendar: CalendarBlank, list: ListBullets, reports: ChartPie, integrations: ArrowsClockwise, expenses: CurrencyCircleDollar, settings: GearSix, admin: ShieldCheck }[currentView]; return <I size={14} weight="fill" />; })()}
                {t(lang, `nav.${currentView}`)}
                <CaretDown size={11} weight="bold" className={cn('transition-transform', showViewMenu && 'rotate-180')} />
              </button>
              {showViewMenu && (
                <>
                  <div className="fixed inset-0 z-99" onClick={() => setShowViewMenu(false)} />
                  <div className={cn('absolute top-full mt-1 z-100 bg-white rounded-2xl border border-slate-200 shadow-2xl py-1 min-w-[130px]', isRtl ? 'left-0' : 'right-0')}>
                    {(session.isAdmin
                      ? ['admin'] as View[]
                      : (['calendar', 'list', 'reports', 'expenses', (session.tenant.integrationsEnabled !== false ? 'integrations' : null), 'settings'].filter(Boolean) as View[])
                    ).map((v) => {
                      const Icon = { calendar: CalendarBlank, list: ListBullets, reports: ChartPie, integrations: ArrowsClockwise, expenses: CurrencyCircleDollar, settings: GearSix, admin: ShieldCheck }[v];
                      return (
                        <button
                          key={v}
                          data-tour={`nav-${v}`}
                          onClick={() => { setCurrentView(v); trackViewChange(v); setShowViewMenu(false); }}
                          className={cn(
                            'w-full px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-colors text-start flex items-center gap-2.5',
                            currentView === v ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                          )}
                        >
                          <Icon size={15} weight={currentView === v ? 'fill' : 'bold'} />
                          {t(lang, `nav.${v}`)}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="text-[10px] sm:text-[11px] font-black uppercase text-slate-400 hover:text-red-600 transition-colors whitespace-nowrap"
            >
              {t(lang, 'misc.logout')}
            </button>
          </div>
        </div>
      </nav>

      {currentView === 'calendar' && (
        <div className="overflow-hidden sm:p-2 flex-1 min-h-0">
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
            setModalAnchor={setModalAnchor}
            selectedBookingId={selectedBooking?.id ?? null}
            showAddModal={showAddModal}
            addModalInitialDate={addModalInitialDate}
            addModalInitialRoom={addModalInitialRoom}
            jumpToToday={jumpToToday}
            onLoadMorePast={loadMorePast}
            onLoadMoreFuture={loadMoreFuture}
            lang={lang}
            tz={tz}
          />
        </div>
      )}
      <main className={cn('container mx-auto p-2 pt-2', currentView === 'calendar' && 'hidden')}>
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
            listContainerRef={listContainerRef}
            rooms={rooms}
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
            tenantName={session.tenant.name}
            lang={lang}
          />
        )}
        {currentView === 'integrations' && session.tenant.integrationsEnabled !== false && (
          <IntegrationsView
            session={session}
            lang={lang}
            onNavigateToSettings={() => setCurrentView('settings')}
          />
        )}
        {currentView === 'expenses' && (
          <ExpenseView session={session} lang={lang} tz={tz} currency={currency} />
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
          onClose={() => { setShowAddModal(false); setModalAnchor(null); }}
          onAdd={handleAddBooking}
          initialDate={addModalInitialDate}
          initialRoom={addModalInitialRoom}
          rooms={rooms}
          currency={currency}
          lang={lang}
          anchor={modalAnchor}
        />
      )}

      {selectedBooking && !showInvoiceModal && (
        <BookingDetailsModal
          booking={selectedBooking}
          onClose={() => { setSelectedBooking(null); setModalAnchor(null); }}
          onDelete={handleDeleteBooking}
          onUpdateStatus={handleUpdateBookingStatus}
          onUpdate={handleUpdateBooking}
          onPrintInvoice={() => setShowInvoiceModal(true)}
          currency={currency}
          lang={lang}
          tz={tz}
          rooms={rooms}
          anchor={modalAnchor}
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

      {showTour && (
        <OnboardingTour
          steps={tourSteps}
          lang={lang}
          onComplete={finishTour}
          onSkip={finishTour}
          onStepChange={handleTourStepChange}
        />
      )}
    </div>
  );
}
