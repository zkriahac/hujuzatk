import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format, addMonths, differenceInCalendarDays, endOfMonth, parseISO, startOfMonth } from 'date-fns';
import { CaretDown, CalendarBlank, ListBullets, ChartPie, GearSix, ShieldCheck, ArrowsClockwise, CloudArrowDown, CurrencyCircleDollar } from 'phosphor-react';
import { authService, type SessionUser } from '../lib/authService';
import { dataService } from '../lib/dataService';
import { trackLogout, trackBookingCreated, trackBookingUpdated, trackBookingCanceled, trackViewChange, trackInvoiceGenerated, clearAnalyticsUser } from '../lib/analytics';
import { getDir, type Language } from '../lib/i18n';
import { t } from '../lib/i18n';
import { cn } from '../utils/cn';
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
import PwaInstallPrompt from './PwaInstallPrompt';
import SyncResultModal from './SyncResultModal';
import OnboardingTour, { type OnboardingStep } from './OnboardingTour';
import { apolloClient } from '../lib/apolloClient';
import { COMPLETE_ONBOARDING_MUTATION, GET_BOOKINGS_QUERY, BULK_DELETE_BOOKINGS_MUTATION, SYNC_ALL_CHANNELS_MUTATION } from '../lib/graphql';
import type { SourceFilter } from './ListView';
import { AddBookingModal, BookingDetailsModal, InvoiceModal, ImportBookingsModal } from './Modals';

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

  const location = useLocation();
  const navigate = useNavigate();

  const VIEW_SLUGS: Record<string, View> = {
    calendar: 'calendar', list: 'list', reports: 'reports',
    settings: 'settings', integrations: 'integrations',
    expenses: 'expenses', admin: 'admin',
  };
  const pathParts = location.pathname.split('/').filter(Boolean);
  const workspaceSlug = pathParts[0] ?? '';
  const pathView = pathParts[1];
  const currentView: View = VIEW_SLUGS[pathView] ?? (session.isAdmin ? 'admin' : 'calendar');

  const setCurrentView = useCallback((v: View) => {
    navigate(`/${workspaceSlug}/${v}`);
  }, [navigate, workspaceSlug]);

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
  const [showImportModal, setShowImportModal] = useState(false);
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
  // Reports fetch their own bookings for the selected range, independent of the
  // calendar's lazy month-loading — otherwise changing the date range wouldn't
  // pull in data for months the calendar never loaded.
  const [reportBookings, setReportBookings] = useState<Booking[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  const [listSearchTerm, setListSearchTerm] = useState('');
  const [listFilter, setListFilter] = useState<ListFilter>('today_checkin');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [listCheckInDateFilter, setListCheckInDateFilter] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [visibleListCount, setVisibleListCount] = useState(30);

  // Server-side pagination for 'all' and 'past' tabs
  const SERVER_PAGE_SIZE = 50;
  const [serverBookings, setServerBookings] = useState<Booking[]>([]);
  const [serverHasMore, setServerHasMore] = useState(false);
  const [serverOffset, setServerOffset] = useState(0);
  const [serverLoading, setServerLoading] = useState(false);
  const useServerMode = listFilter === 'all' || listFilter === 'past';

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

  // Bulk delete — wired to ListView "Delete selected" button.
  //   1. Server delete (returns deleted-row count, not true/false — diagnoses stale rows)
  //   2. Evict each Booking from Apollo's normalized cache + GC dangling refs
  //   3. Filter the local React state so the UI reflects immediately
  //   4. If server count < requested count, alert the user — otherwise silent success
  const handleBulkDelete = async (ids: string[]) => {
    if (!ids.length) return;
    setBulkDeleting(true);
    try {
      console.log(`[bulkDelete] sending ${ids.length} ids:`, ids);
      const { data, errors } = await apolloClient.mutate({
        mutation: BULK_DELETE_BOOKINGS_MUTATION,
        variables: { ids },
        errorPolicy: 'all',
      });
      if (errors?.length) throw errors[0];
      const deletedCount = Number(data?.bulkDeleteBookings ?? 0);
      console.log(`[bulkDelete] server deleted ${deletedCount}/${ids.length}`);

      // Step 2 — evict from Apollo cache (so cached queries don't re-hydrate)
      ids.forEach((id) => apolloClient.cache.evict({ id: `Booking:${id}` }));
      apolloClient.cache.gc();

      // Step 3 — drop them from React state regardless of count, so phantom rows
      // disappear from the UI even when the server already deleted them.
      const idSet = new Set(ids);
      setBookings((prev) => prev.filter((b) => !idSet.has(b.id)));
      setServerBookings((prev) => prev.filter((b) => !idSet.has(b.id)));

      // Step 4 — surface mismatches.
      if (deletedCount === 0) {
        alert(`Server reported 0 rows deleted. The ${ids.length} selected bookings were either already deleted or belong to a different account.`);
      } else if (deletedCount < ids.length) {
        alert(`Deleted ${deletedCount} of ${ids.length}. The other ${ids.length - deletedCount} were already gone (stale rows have been cleaned from your view).`);
      }
    } catch (err: any) {
      console.error('Bulk delete failed:', err);
      alert(err?.message || t(lang, 'misc.errorDeleting') || 'Delete failed.');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Two distinct calendar actions:
  //   • refreshCalendar — local-only reload from DB. Fast (~500ms). For "I deleted
  //     bookings in another tab" cases. Resets calRange + clears bookings + scrolls today.
  //   • syncCalendar    — channel sync (Airbnb/Gathern/Booking.com) THEN refresh.
  //     Slow (5–30s). Shows the SyncResultModal if something changed.
  // Sync failure is non-blocking (e.g. integrations disabled) — local reload still runs.
  const [refreshingCalendar, setRefreshingCalendar] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [calendarSyncResults, setCalendarSyncResults] = useState<any[] | null>(null);

  const localReloadCalendar = async () => {
    // Reset to a clean slate centered on today
    const DEFAULT_BEFORE = 1;
    const DEFAULT_AFTER = 2;
    setCalRange({ before: DEFAULT_BEFORE, after: DEFAULT_AFTER });
    setLoadedMonths(new Set());
    setBookings([]); // Fully clear so server-side deletions disappear from UI

    const now = startOfMonth(new Date());
    const months: Date[] = [];
    for (let m = -DEFAULT_BEFORE; m <= DEFAULT_AFTER; m++) {
      months.push(addMonths(now, m));
    }
    await Promise.all(months.map((d) => loadMonthBookings(d, true)));

    // Evict cache so any subsequent cache-first lookups can't re-introduce stale rows
    apolloClient.cache.evict({ fieldName: 'getBookingsByDateRange' });
    apolloClient.cache.gc();
  };

  const refreshCalendar = async () => {
    if (refreshingCalendar || syncingCalendar) return;
    setRefreshingCalendar(true);
    try {
      await localReloadCalendar();
    } finally {
      setRefreshingCalendar(false);
    }
  };

  const syncCalendar = async () => {
    if (refreshingCalendar || syncingCalendar) return;
    setSyncingCalendar(true);
    try {
      // 1) Channel sync (best-effort)
      if (session.tenant.integrationsEnabled !== false) {
        try {
          // No mode → each integration uses its own `syncLookbackDays` setting (Settings → Channel Integrations).
          const { data } = await apolloClient.mutate({
            mutation: SYNC_ALL_CHANNELS_MUTATION,
            variables: { mode: null },
          });
          const results = (data as any)?.syncAllChannels;
          if (results && results.length > 0) {
            const totals = results.reduce(
              (acc: any, r: any) => ({
                changed: acc.changed + r.imported + r.updated + r.canceled + r.blocksRemoved,
                errors: acc.errors + (r.errors?.length || 0),
              }),
              { changed: 0, errors: 0 },
            );
            // Only pop the modal if something actually happened
            if (totals.changed > 0 || totals.errors > 0) {
              setCalendarSyncResults(results);
            }
          }
        } catch { /* silent — proceed to local reload */ }
      }
      // 2) Local reload (same as refreshCalendar)
      await localReloadCalendar();
    } finally {
      setSyncingCalendar(false);
    }
  };

  const rooms = session.tenant.rooms?.length ? session.tenant.rooms : DEFAULT_ROOMS;

  const handleAddBooking = async (newBooking: any) => {
    const bookingInput = {
      guestName: newBooking.guestName,
      guestEmail: newBooking.guestEmail || undefined,
      guestPhone: newBooking.phone || newBooking.guestPhone || '',
      guestIdNumber: newBooking.guestIdNumber || undefined,
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
    if (updated) {
      setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
      trackBookingUpdated(String(updated.id), Object.keys(updates || {}));
    }
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
        if (listFilter === 'today_checkin')  return b.checkIn.slice(0, 10)  === todayStr;
        if (listFilter === 'today_checkout') return b.checkOut.slice(0, 10) === todayStr;
        if (listFilter === 'active') return effective === 'ACTIVE';
        if (listFilter === 'past') return effective === 'COMPLETED' || effective === 'NO_SHOW';
        return true;
      });
    }
    // Source filter: only meaningful on the "all" tab; for other tabs we leave the set alone.
    if (listFilter === 'all' && sourceFilter !== 'all') {
      filtered = filtered.filter((b: any) =>
        sourceFilter === 'synced' ? !!b.externalChannel : !b.externalChannel,
      );
    }
    // Check-in date filter: if set, only show bookings matching that date
    if (listCheckInDateFilter) {
      filtered = filtered.filter((b: Booking) => b.checkIn.slice(0, 10) === listCheckInDateFilter);
    }
    return filtered.sort((a: Booking, b: Booking) => b.checkIn.localeCompare(a.checkIn));
  }, [bookings, listSearchTerm, listFilter, sourceFilter, listCheckInDateFilter]);

  const visibleBookings = filteredBookings.slice(0, visibleListCount);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  // Fire server query when 'all' or 'past' tab is active
  useEffect(() => {
    if (!useServerMode) return;
    setServerOffset(0);
    setServerBookings([]);
    setServerHasMore(false);
    const timer = setTimeout(async () => {
      setServerLoading(true);
      try {
        const filter: Record<string, any> = {};
        if (listSearchTerm) filter.guestName = listSearchTerm;
        if (listFilter === 'past') filter.endDate = format(new Date(), 'yyyy-MM-dd');
        const result = await apolloClient.query({
          query: GET_BOOKINGS_QUERY,
          variables: { filter, limit: SERVER_PAGE_SIZE, offset: 0, sortBy: 'checkIn', sortOrder: 'desc' },
          fetchPolicy: 'network-only',
        });
        const fetched: Booking[] = result.data?.getBookings ?? [];
        setServerBookings(fetched);
        setServerHasMore(fetched.length === SERVER_PAGE_SIZE);
      } catch { /* network error — show empty list */ }
      finally { setServerLoading(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [useServerMode, listFilter, listSearchTerm]);

  const handleServerLoadMore = async () => {
    const newOffset = serverOffset + SERVER_PAGE_SIZE;
    setServerLoading(true);
    try {
      const filter: Record<string, any> = {};
      if (listSearchTerm) filter.guestName = listSearchTerm;
      if (listFilter === 'past') filter.endDate = format(new Date(), 'yyyy-MM-dd');
      const result = await apolloClient.query({
        query: GET_BOOKINGS_QUERY,
        variables: { filter, limit: SERVER_PAGE_SIZE, offset: newOffset, sortBy: 'checkIn', sortOrder: 'desc' },
        fetchPolicy: 'network-only',
      });
      const fetched: Booking[] = result.data?.getBookings ?? [];
      setServerBookings(prev => [...prev, ...fetched]);
      setServerHasMore(fetched.length === SERVER_PAGE_SIZE);
      setServerOffset(newOffset);
    } catch {}
    finally { setServerLoading(false); }
  };

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

  useEffect(() => { setVisibleListCount(30); }, [listFilter, listSearchTerm, listCheckInDateFilter]);

  useEffect(() => {
    if (currentView !== 'reports') return;
    let cancelled = false;
    setReportLoading(true);
    dataService
      .getBookingsByDateRange(reportStartDate, reportEndDate, reportType === 'created' ? 'created' : 'stay')
      .then((rows) => { if (!cancelled) setReportBookings(rows); })
      .finally(() => { if (!cancelled) setReportLoading(false); });
    return () => { cancelled = true; };
  }, [currentView, reportStartDate, reportEndDate, reportType]);

  // Overview-tab totals only — cheap O(n) sums. Per-room and monthly occupancy
  // (the expensive day-by-day loop) live in the Occupancy tab inside ReportsView.
  const reportData = useMemo(() => {
    const filtered = reportBookings.filter((b: Booking) => {
      if (b.status === 'CANCELED') return false;
      const dateToCompare = reportType === 'stay' ? b.checkIn : b.createdAt.slice(0, 10);
      const inRange = dateToCompare >= reportStartDate && dateToCompare <= reportEndDate;
      const roomMatch = reportRoomFilter === 'ALL' || b.room === reportRoomFilter;
      return inRange && roomMatch;
    });

    // remaining is stored on the booking but fall back to (totalPrice - deposit) for
    // older rows where the server didn't compute it.
    const remainingOf = (b: Booking): number =>
      typeof (b as any).remaining === 'number'
        ? (b as any).remaining
        : Math.max(0, (b.totalPrice || 0) - (b.deposit || 0));

    const totalRevenue = filtered.reduce((sum: number, b: Booking) => sum + b.totalPrice, 0);
    const totalDeposit = filtered.reduce((sum: number, b: Booking) => sum + (b.deposit || 0), 0);
    const totalRemaining = filtered.reduce((sum: number, b: Booking) => sum + remainingOf(b), 0);
    const totalNights = filtered.reduce((sum: number, b: Booking) => sum + b.nights, 0);

    return { totalRevenue, totalDeposit, totalRemaining, totalNights, bookingCount: filtered.length };
  }, [reportBookings, reportStartDate, reportEndDate, reportRoomFilter, reportType]);

  const handleLogout = async () => {
    trackLogout();
    clearAnalyticsUser();
    await authService.logout();
    onSessionChange(null);
    window.location.href = '/';
  };


  // Sidebar nav items (desktop only). Admin sees only the admin link.
  const sidebarItems: View[] = session.isAdmin
    ? ['admin']
    : (() => {
        const base: View[] = ['calendar', 'list', 'expenses', 'reports'];
        if (session.tenant.integrationsEnabled !== false) base.push('integrations');
        base.push('settings');
        return base;
      })();
  const ICONS: Record<View, any> = {
    calendar: CalendarBlank, list: ListBullets, reports: ChartPie,
    integrations: CloudArrowDown, expenses: CurrencyCircleDollar,
    settings: GearSix, admin: ShieldCheck,
  };

  return (
    <div className={cn('bg-slate-50 text-slate-900 font-sans selection:bg-emerald-100', currentView === 'calendar' ? 'fixed inset-0 flex flex-row overflow-hidden' : 'min-h-screen lg:flex lg:flex-row', dir === 'rtl' && 'rtl')} dir={dir}>
      {/* ── Desktop sidebar (lg+) ─────────────────────────────────── */}
      <aside
        className={cn(
          'hidden lg:flex flex-col w-60 shrink-0 bg-white border-slate-200 z-40',
          isRtl ? 'border-l' : 'border-r',
          currentView === 'calendar' ? 'h-full' : 'lg:sticky lg:top-0 lg:h-screen',
        )}
      >
        {/* Brand — wordmark at the top. Current workspace name lives in the AccountSwitcher
            at the bottom, so we don't duplicate it here. */}
        <div className={cn('h-14 px-5 flex items-center gap-2.5 border-b border-slate-100 shrink-0')}>
          <img src="/logo.svg" alt="Hujuzatk" className="w-9 h-9 shrink-0" />
          <span className="font-black text-slate-900 text-base leading-none tracking-tight" style={{ letterSpacing: '-0.02em' }}>
            Hujuzatk
          </span>
        </div>
        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {sidebarItems.map((v) => {
            const Icon = ICONS[v];
            const active = currentView === v;
            return (
              <button
                key={v}
                data-tour={`nav-${v}`}
                onClick={() => { setCurrentView(v); trackViewChange(v); }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] font-bold transition-colors text-start',
                  active
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50',
                )}
              >
                <Icon size={17} weight={active ? 'fill' : 'bold'} className="shrink-0" />
                <span className="truncate">{t(lang, `nav.${v}`)}</span>
              </button>
            );
          })}
        </nav>
        {/* Account switcher at the bottom — flat mode renders inline (no popup that overflows
            below the viewport at the sidebar's bottom edge). */}
        {!session.isAdmin && (
          <div className="border-t border-slate-100 p-2 shrink-0 max-h-[60vh] overflow-y-auto">
            <AccountSwitcher
              lang={lang}
              isRtl={isRtl}
              currentTenantId={session.tenantId}
              session={session}
              onLogout={handleLogout}
              onNavigate={(v) => setCurrentView(v)}
              flat
            />
          </div>
        )}
      </aside>

      {/* ── Main content column ──────────────────────────────────── */}
      <div className={cn('flex-1 flex flex-col min-w-0', currentView === 'calendar' && 'min-h-0')}>
      <nav className="lg:hidden bg-white border-b border-slate-200 sticky top-0 z-100 h-12 sm:h-14">
        <div className="px-3 sm:px-6 flex justify-between h-full items-center gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img src="/logo.svg" alt="Logo" className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" />
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="relative">
              <button
                onClick={() => setShowViewMenu(v => !v)}
                data-tour="view-switcher"
                className="flex items-center gap-1.5 px-2.5 py-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] sm:text-[11px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors"
              >
                {(() => { const I = { calendar: CalendarBlank, list: ListBullets, reports: ChartPie, integrations: CloudArrowDown, expenses: CurrencyCircleDollar, settings: GearSix, admin: ShieldCheck }[currentView]; return <I size={14} weight="fill" />; })()}
                {t(lang, `nav.${currentView}`)}
                <CaretDown size={11} weight="bold" className={cn('transition-transform', showViewMenu && 'rotate-180')} />
              </button>
              {showViewMenu && (
                <>
                  <div className="fixed inset-0 z-99" onClick={() => setShowViewMenu(false)} />
                  <div className="absolute top-full mt-1 z-100 bg-white rounded-2xl border border-slate-200 shadow-2xl py-1 min-w-[130px] end-0">
                    {(session.isAdmin
                      ? ['admin'] as View[]
                      : (['calendar', 'list', 'expenses', 'reports'] as View[])
                    ).map((v) => {
                      const Icon = { calendar: CalendarBlank, list: ListBullets, reports: ChartPie, integrations: CloudArrowDown, expenses: CurrencyCircleDollar, settings: GearSix, admin: ShieldCheck }[v];
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
            {!session.isAdmin && (
              <AccountSwitcher
                lang={lang}
                isRtl={isRtl}
                currentTenantId={session.tenantId}
                session={session}
                onLogout={handleLogout}
                onNavigate={(v) => setCurrentView(v)}
              />
            )}
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
            onRefresh={refreshCalendar}
            onSync={syncCalendar}
            refreshing={refreshingCalendar}
            syncing={syncingCalendar}
            integrationsEnabled={session.tenant.integrationsEnabled !== false}
            onLoadMorePast={loadMorePast}
            onLoadMoreFuture={loadMoreFuture}
            lang={lang}
            tz={tz}
          />
        </div>
      )}
      <main className={cn('container mx-auto p-2 pt-2', currentView === 'calendar' && 'hidden')}>
        {currentView === 'list' && (() => {
          // Apply the source filter to server-mode bookings too (only relevant on the "all" tab,
          // which is one of the two server-mode tabs)
          const filteredServer = (useServerMode && listFilter === 'all' && sourceFilter !== 'all')
            ? serverBookings.filter((b: any) => sourceFilter === 'synced' ? !!b.externalChannel : !b.externalChannel)
            : serverBookings;
          const listBookings = useServerMode ? filteredServer : visibleBookings;
          const listFull = useServerMode ? filteredServer : filteredBookings;
          return (
          <ListView
            bookings={listBookings}
            fullFiltered={listFull}
            visibleCount={useServerMode ? filteredServer.length : visibleListCount}
            totalCount={useServerMode ? filteredServer.length : filteredBookings.length}
            onLoadMore={useServerMode ? handleServerLoadMore : () => setVisibleListCount(prev => prev + 50)}
            serverHasMore={useServerMode && serverHasMore}
            serverLoading={serverLoading}
            listFilter={listFilter}
            setListFilter={setListFilter}
            sourceFilter={sourceFilter}
            setSourceFilter={setSourceFilter}
            listCheckInDateFilter={listCheckInDateFilter}
            setListCheckInDateFilter={setListCheckInDateFilter}
            onBulkDelete={handleBulkDelete}
            bulkDeleting={bulkDeleting}
            listSearchTerm={listSearchTerm}
            setListSearchTerm={setListSearchTerm}
            setShowAddModal={setShowAddModal}
            onImportClick={() => setShowImportModal(true)}
            setSelectedBooking={setSelectedBooking}
            listContainerRef={listContainerRef}
            rooms={rooms}
            currency={currency}
            lang={lang}
            tz={tz}
          />
          );
        })()}
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
            reportLoading={reportLoading}
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
      </div>
      {/* ── End main content column ─────────────────────────────── */}

      {showImportModal && (
        <ImportBookingsModal
          onClose={() => setShowImportModal(false)}
          rooms={rooms}
          lang={lang}
        />
      )}

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
          defaultNightPrice={(session.tenant as any).defaultNightPrice}
        />
      )}

      {selectedBooking && !showInvoiceModal && (
        <BookingDetailsModal
          booking={selectedBooking}
          onClose={() => { setSelectedBooking(null); setModalAnchor(null); }}
          onDelete={handleDeleteBooking}
          onUpdateStatus={handleUpdateBookingStatus}
          onUpdate={handleUpdateBooking}
          onPrintInvoice={() => {
            trackInvoiceGenerated(String(selectedBooking.id));
            setShowInvoiceModal(true);
          }}
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
          rooms={rooms}
          company={{
            companyName: session.tenant.companyName,
            companyAddress: session.tenant.companyAddress,
            companyPhone: session.tenant.companyPhone,
            companyEmail: session.tenant.companyEmail,
            companyTaxId: session.tenant.companyTaxId,
            companyLogoUrl: session.tenant.companyLogoUrl,
            invoiceFooter: session.tenant.invoiceFooter,
          }}
        />
      )}

      <PwaInstallPrompt lang={lang} isRtl={isRtl} />

      <SyncResultModal
        open={!!calendarSyncResults}
        onClose={() => setCalendarSyncResults(null)}
        results={calendarSyncResults ?? []}
        rooms={rooms}
        lang={lang}
        isRtl={isRtl}
      />

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
