import { useEffect, useMemo, useState } from 'react';
import { Layout, ChartPie, CreditCard, Calendar, Users, Target, FileXls, TrendDown, Scales, CaretDown, CaretLeft, CaretRight, ChartBar, Table, Wallet, Hourglass } from 'phosphor-react';
import { parseISO, differenceInDays, format, endOfMonth } from 'date-fns';
import { t, type Language } from '../lib/i18n';
import { apolloClient } from '../lib/apolloClient';
import { GET_EXPENSES_QUERY } from '../lib/graphql';
import { dataService } from '../lib/dataService';
import { useYearlyOccupancy } from '../hooks/useGraphQL';

interface ReportsViewProps {
  rooms: any[];
  reportType: 'stay' | 'created';
  setReportType: (v: 'stay' | 'created') => void;
  reportStartDate: string;
  reportEndDate: string;
  setReportStartDate: (v: string) => void;
  setReportEndDate: (v: string) => void;
  reportRoomFilter: string;
  setReportRoomFilter: (v: string) => void;
  reportData: any;
  reportLoading: boolean;
  currency: string;
  lang: Language;
  tenantName?: string;
}

interface Expense {
  id: string;
  roomId: string | null;
  date: string;
  amount: number;
  category: string;
  reason: string;
}

export default function ReportsView({
  rooms,
  reportType,
  setReportType,
  reportStartDate,
  reportEndDate,
  setReportStartDate,
  setReportEndDate,
  reportRoomFilter,
  setReportRoomFilter,
  reportData,
  reportLoading,
  currency,
  lang,
  tenantName,
}: ReportsViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'occupancy'>('overview');

  // ============= OVERVIEW (day-range) =============
  const [expenses, setExpenses] = useState<Expense[]>([]);
  // Refetch expenses whenever the date range / room filter changes — keeps the
  // P&L numbers in sync with the bookings panel above.
  useEffect(() => {
    const variables: any = {
      startDate: new Date(reportStartDate + 'T00:00:00').toISOString(),
      endDate: new Date(reportEndDate + 'T23:59:59').toISOString(),
    };
    if (reportRoomFilter !== 'ALL') variables.roomId = reportRoomFilter;
    apolloClient.query({ query: GET_EXPENSES_QUERY, variables, fetchPolicy: 'network-only' })
      .then(({ data }) => setExpenses((data as any)?.getExpenses || []))
      .catch(() => setExpenses([]));
  }, [reportStartDate, reportEndDate, reportRoomFilter]);

  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const netIncome = reportData.totalRevenue - totalExpenses;

  // ============= OCCUPANCY (year / month) =============
  const [occYear, setOccYear] = useState(new Date().getFullYear());
  const [occMonth, setOccMonth] = useState<number | 'all'>('all');
  const [occBookings, setOccBookings] = useState<any[]>([]);
  const [occExpenses, setOccExpenses] = useState<Expense[]>([]);
  const [occLoading, setOccLoading] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState<'chart' | 'table'>('chart');
  const { data: yearlyOccupancy, loading: heatmapLoading } = useYearlyOccupancy(occYear);

  // Lazily pull the whole selected year (bookings + expenses) — only when the
  // Occupancy tab is open, keyed on the year. The month sub-filter is applied
  // client-side in the memo below, so switching months never refetches.
  useEffect(() => {
    if (activeTab !== 'occupancy') return;
    let cancelled = false;
    setOccLoading(true);
    const start = `${occYear}-01-01`;
    const end = `${occYear}-12-31`;
    Promise.all([
      dataService.getBookingsByDateRange(start, end, 'stay'),
      apolloClient
        .query({
          query: GET_EXPENSES_QUERY,
          variables: {
            startDate: new Date(start + 'T00:00:00').toISOString(),
            endDate: new Date(end + 'T23:59:59').toISOString(),
          },
          fetchPolicy: 'network-only',
        })
        .then(({ data }) => (data as any)?.getExpenses || [])
        .catch(() => []),
    ])
      .then(([bk, ex]) => {
        if (cancelled) return;
        setOccBookings(bk);
        setOccExpenses(ex);
      })
      .finally(() => { if (!cancelled) setOccLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, occYear]);

  // The expensive day-by-day occupancy loop lives here, bounded to the selected
  // year (or single month) and only mounted while the Occupancy tab is active.
  const occData = useMemo(() => {
    const months = lang === 'ar' ? MONTHS_AR : lang === 'tr' ? MONTHS_TR : MONTHS_EN;
    const pad = (n: number) => String(n).padStart(2, '0');
    const winStart = occMonth === 'all' ? `${occYear}-01-01` : `${occYear}-${pad(occMonth)}-01`;
    const winEnd = occMonth === 'all' ? `${occYear}-12-31` : format(endOfMonth(parseISO(winStart)), 'yyyy-MM-dd');

    const remainingOf = (b: any): number =>
      typeof b.remaining === 'number' ? b.remaining : Math.max(0, (b.totalPrice || 0) - (b.deposit || 0));

    const roomStats = rooms.map((room: any) => {
      const roomBookings = occBookings.filter(
        (b: any) => b.status !== 'CANCELED' && b.room === room.id && b.checkIn >= winStart && b.checkIn <= winEnd,
      );
      const totalNights = roomBookings.reduce((s: number, b: any) => s + b.nights, 0);
      const totalRevenue = roomBookings.reduce((s: number, b: any) => s + b.totalPrice, 0);
      const totalDeposit = roomBookings.reduce((s: number, b: any) => s + (b.deposit || 0), 0);
      const totalRemaining = roomBookings.reduce((s: number, b: any) => s + remainingOf(b), 0);
      const start = parseISO(winStart);
      const end = parseISO(winEnd);
      const daysInWindow = differenceInDays(end, start) + 1;
      let occupiedDays = 0;
      if (daysInWindow > 0) {
        let current = start;
        while (current <= end) {
          const dStr = format(current, 'yyyy-MM-dd');
          if (roomBookings.some((b: any) => dStr >= b.checkIn && dStr < b.checkOut)) occupiedDays++;
          current = new Date(current.getTime() + 86400000);
        }
      }
      const occupancyRate = daysInWindow > 0 ? (occupiedDays / daysInWindow) * 100 : 0;
      return { roomId: room.id, roomName: room.name, totalNights, totalRevenue, totalDeposit, totalRemaining, occupancyRate };
    });

    const monthStat = (m: number) => {
      const ms = `${occYear}-${pad(m)}-01`;
      const me = format(endOfMonth(parseISO(ms)), 'yyyy-MM-dd');
      const monthBookings = occBookings.filter(
        (b: any) => b.status !== 'CANCELED' && b.checkIn <= me && b.checkOut > ms,
      );
      const revenue = monthBookings.reduce((s: number, b: any) => (b.checkIn >= ms && b.checkIn <= me ? s + b.totalPrice : s), 0);
      const occupancy = monthBookings.reduce((s: number, b: any) => {
        const sd = b.checkIn < ms ? parseISO(ms) : parseISO(b.checkIn);
        const ed = b.checkOut > me ? parseISO(me) : parseISO(b.checkOut);
        return s + Math.max(0, differenceInDays(ed, sd));
      }, 0);
      const totalPossibleNights = differenceInDays(parseISO(me), parseISO(ms)) + 1;
      const totalRooms = rooms.length || 1;
      const fillRate = totalPossibleNights > 0 ? (occupancy / (totalPossibleNights * totalRooms)) * 100 : 0;
      return { month: `${months[m - 1]} ${occYear}`, revenue, fillRate };
    };

    const monthIndexes = occMonth === 'all' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [occMonth];
    const monthlyStats = monthIndexes.map(monthStat);

    const avgFill = roomStats.length === 0 ? 0 : roomStats.reduce((a, b) => a + b.occupancyRate, 0) / roomStats.length;
    const totalRevenue = roomStats.reduce((s, r) => s + r.totalRevenue, 0);
    const totalNights = roomStats.reduce((s, r) => s + r.totalNights, 0);

    const expensesByRoom: Record<string, number> = {};
    occExpenses.forEach((e) => {
      const d = e.date.split('T')[0];
      if (d >= winStart && d <= winEnd) {
        const key = e.roomId || '__general__';
        expensesByRoom[key] = (expensesByRoom[key] || 0) + e.amount;
      }
    });

    return { roomStats, monthlyStats, avgFill, totalRevenue, totalNights, expensesByRoom };
  }, [occBookings, occExpenses, occYear, occMonth, rooms, lang]);

  // Excel sheet names are capped at 31 chars and can't contain : \ / ? * [ ] — sanitize.
  // Sheet labels and column headers are translated to the user's current language so
  // an Arabic / Turkish user gets an exported file that's actually usable. The xlsx
  // library already handles UTF-8 in cell values, so guest/room/category names in any
  // script flow through unchanged.
  const safeSheetName = (s: string) => s.replace(/[\\/?*[\]:]/g, '').slice(0, 31);

  // Overview export: day-range summary + expenses. Dynamic-import xlsx so it only
  // loads when the user clicks Export.
  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const roomMap = Object.fromEntries(rooms.map((r: any) => [r.id, r.name]));
    const summaryRows = [
      [t(lang, 'export.title'), tenantName || ''],
      [t(lang, 'export.range'), `${reportStartDate} → ${reportEndDate}`],
      [t(lang, 'export.roomFilterLabel'), reportRoomFilter === 'ALL' ? t(lang, 'export.all') : (rooms.find((r: any) => r.id === reportRoomFilter)?.name || reportRoomFilter)],
      [],
      [t(lang, 'reports.totalRevenue'), reportData.totalRevenue],
      [t(lang, 'reports.totalDeposit'), reportData.totalDeposit],
      [t(lang, 'reports.totalRemaining'), reportData.totalRemaining],
      [t(lang, 'reports.expenses'), totalExpenses],
      [t(lang, 'reports.netIncome'), netIncome],
      [t(lang, 'reports.totalNights'), reportData.totalNights],
      [t(lang, 'reports.totalBookings'), reportData.bookingCount],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), safeSheetName(t(lang, 'export.summary')));
    const expSheet = [[
      t(lang, 'export.date'),
      t(lang, 'reports.room'),
      t(lang, 'export.category'),
      t(lang, 'export.reason'),
      t(lang, 'export.amount'),
    ]];
    expenses.forEach((e) => {
      expSheet.push([
        e.date.split('T')[0],
        e.roomId ? (roomMap[e.roomId] || e.roomId) : t(lang, 'export.general'),
        e.category,
        e.reason,
        String(e.amount),
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expSheet), safeSheetName(t(lang, 'export.expensesSheet')));
    XLSX.writeFile(wb, `hujuzatk-report-${(tenantName || 'tenant').replace(/\s+/g, '_')}-${reportStartDate}-${reportEndDate}.xlsx`);
  };

  // Occupancy export: per-room + monthly, scoped to the selected year (and month).
  const handleExportOccupancy = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const perRoom = [[
      t(lang, 'reports.room'),
      t(lang, 'reports.revenue'),
      t(lang, 'reports.deposit'),
      t(lang, 'reports.remaining'),
      t(lang, 'reports.expenses'),
      t(lang, 'reports.net'),
      t(lang, 'reports.occupancy') + ' %',
    ]];
    occData.roomStats.forEach((s) => {
      const exp = occData.expensesByRoom[s.roomId] || 0;
      perRoom.push([
        s.roomName || s.roomId,
        s.totalRevenue,
        s.totalDeposit,
        s.totalRemaining,
        exp,
        s.totalRevenue - exp,
        s.occupancyRate.toFixed(1),
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(perRoom), safeSheetName(t(lang, 'export.perRoom')));
    const monthly = [[
      t(lang, 'reports.month'),
      t(lang, 'reports.revenue'),
      t(lang, 'reports.fillRate') + ' %',
    ]];
    occData.monthlyStats.forEach((s) => monthly.push([s.month, s.revenue, s.fillRate.toFixed(1)]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(monthly), safeSheetName(t(lang, 'export.monthly')));
    XLSX.writeFile(wb, `hujuzatk-occupancy-${(tenantName || 'tenant').replace(/\s+/g, '_')}-${occYear}.xlsx`);
  };

  const MONTH_LABELS = lang === 'ar' ? MONTHS_AR : lang === 'tr' ? MONTHS_TR : MONTHS_EN;

  return (
    <div className="space-y-7 pb-12">
      {/* Tab bar — segmented control, emerald-600 active */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-2 flex gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <ChartPie size={16} weight="bold" /> {t(lang, 'reports.tabOverview')}
        </button>
        <button
          onClick={() => setActiveTab('occupancy')}
          className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'occupancy' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Calendar size={16} weight="bold" /> {t(lang, 'reports.tabOccupancy')}
        </button>
      </div>

      {activeTab === 'overview' ? (
        <>
          {/* Filter card — pill-shaped controls in one airy white surface */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-7">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">{t(lang, 'reports.type')}</label>
                <div className="relative">
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as 'stay' | 'created')}
                    className="w-full bg-slate-50 border border-slate-100 rounded-full px-5 py-2.5 pe-10 text-sm font-black focus:ring-2 focus:ring-emerald-500 transition-all"
                    style={{ appearance: 'none', WebkitAppearance: 'none' }}
                  >
                    <option value="stay">{t(lang, 'reports.stayDate')}</option>
                    <option value="created">{t(lang, 'reports.createdDate')}</option>
                  </select>
                  <CaretDown size={14} weight="bold" className="pointer-events-none absolute top-1/2 -translate-y-1/2 end-4 text-slate-400" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">{t(lang, 'reports.fromDate')}</label>
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-full px-5 py-2.5 text-sm font-black focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">{t(lang, 'reports.toDate')}</label>
                <input
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-full px-5 py-2.5 text-sm font-black focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">{t(lang, 'reports.roomFilter')}</label>
                <div className="relative">
                  <select
                    value={reportRoomFilter}
                    onChange={(e) => setReportRoomFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-full px-5 py-2.5 pe-10 text-sm font-black focus:ring-2 focus:ring-emerald-500"
                    style={{ appearance: 'none', WebkitAppearance: 'none' }}
                  >
                    <option value="ALL">{t(lang, 'reports.allRooms')}</option>
                    {rooms.map((r: any) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  <CaretDown size={14} weight="bold" className="pointer-events-none absolute top-1/2 -translate-y-1/2 end-4 text-slate-400" />
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-5">
              <button
                onClick={handleExportExcel}
                disabled={reportLoading || reportData.bookingCount === 0}
                className="bg-emerald-600 text-white px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileXls size={18} weight="bold" /> {t(lang, 'reports.exportExcel')}
              </button>
            </div>
          </div>

          {reportLoading ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Hourglass size={28} weight="duotone" className="animate-pulse" />
              <span className="text-sm font-black uppercase tracking-widest">
                {lang === 'ar' ? 'جاري التحميل…' : lang === 'tr' ? 'Yükleniyor…' : 'Loading…'}
              </span>
            </div>
          ) : reportData.bookingCount === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <ChartPie size={28} weight="duotone" />
              <span className="text-sm font-black">
                {lang === 'ar' ? 'لا توجد حجوزات في هذه الفترة' : lang === 'tr' ? 'Bu tarih aralığında rezervasyon yok' : 'No bookings in this date range'}
              </span>
            </div>
          ) : (
            <>
              {/* P&L row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <StatCard variant="bold" tone="emerald"
                          label={t(lang, 'reports.income')}
                          value={`${currency} ${reportData.totalRevenue.toLocaleString()}`}
                          Icon={CreditCard} />
                <StatCard variant="bold" tone="rose"
                          label={t(lang, 'reports.expenses')}
                          value={`${currency} ${totalExpenses.toLocaleString()}`}
                          Icon={TrendDown} />
                <StatCard variant="bold" tone={netIncome < 0 ? 'amber' : 'slate'}
                          label={t(lang, 'reports.netIncome')}
                          value={`${currency} ${netIncome.toLocaleString()}`}
                          Icon={Scales} />
              </div>

              {/* Cash row — what's been collected vs what's still owed across the date range. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <StatCard variant="bold" tone="emerald"
                          label={t(lang, 'reports.totalDeposit')}
                          value={`${currency} ${(reportData.totalDeposit ?? 0).toLocaleString()}`}
                          Icon={Wallet} />
                <StatCard variant="bold" tone="amber"
                          label={t(lang, 'reports.totalRemaining')}
                          value={`${currency} ${(reportData.totalRemaining ?? 0).toLocaleString()}`}
                          Icon={Hourglass} />
              </div>

              {/* KPI row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <StatCard variant="bold" tone="blue"
                          label={t(lang, 'reports.totalNights')}
                          value={String(reportData.totalNights)}
                          Icon={Calendar} />
                <StatCard variant="bold" tone="indigo"
                          label={t(lang, 'reports.totalBookings')}
                          value={String(reportData.bookingCount)}
                          Icon={Users} />
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {/* Occupancy filter card — Year stepper + Month dropdown, no day picker */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-7">
            <div className="flex flex-wrap items-end gap-5">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">{t(lang, 'reports.year')}</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOccYear((y) => y - 1)}
                    className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    {lang === 'ar' ? <CaretRight size={14} weight="bold" /> : <CaretLeft size={14} weight="bold" />}
                  </button>
                  <span className="text-sm font-black text-slate-900 w-14 text-center tabular-nums">{occYear}</span>
                  <button
                    onClick={() => setOccYear((y) => y + 1)}
                    disabled={occYear >= new Date().getFullYear()}
                    className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {lang === 'ar' ? <CaretLeft size={14} weight="bold" /> : <CaretRight size={14} weight="bold" />}
                  </button>
                </div>
              </div>
              <div className="min-w-[180px]">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">{t(lang, 'reports.month')}</label>
                <div className="relative">
                  <select
                    value={occMonth}
                    onChange={(e) => setOccMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-100 rounded-full px-5 py-2.5 pe-10 text-sm font-black focus:ring-2 focus:ring-emerald-500"
                    style={{ appearance: 'none', WebkitAppearance: 'none' }}
                  >
                    <option value="all">{t(lang, 'reports.allMonths')}</option>
                    {MONTH_LABELS.map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                  <CaretDown size={14} weight="bold" className="pointer-events-none absolute top-1/2 -translate-y-1/2 end-4 text-slate-400" />
                </div>
              </div>
              <div className="ms-auto">
                <button
                  onClick={handleExportOccupancy}
                  disabled={occLoading}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FileXls size={18} weight="bold" /> {t(lang, 'reports.exportExcel')}
                </button>
              </div>
            </div>
          </div>

          {occLoading && occBookings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Hourglass size={28} weight="duotone" className="animate-pulse" />
              <span className="text-sm font-black uppercase tracking-widest">
                {lang === 'ar' ? 'جاري التحميل…' : lang === 'tr' ? 'Yükleniyor…' : 'Loading…'}
              </span>
            </div>
          ) : (
            <>
              {/* Occupancy KPI row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <StatCard variant="bold" tone="amber"
                          label={t(lang, 'reports.avgFillRate')}
                          value={`${occData.avgFill.toFixed(1)}%`}
                          Icon={Target} />
                <StatCard variant="bold" tone="blue"
                          label={t(lang, 'reports.totalNights')}
                          value={String(occData.totalNights)}
                          Icon={Calendar} />
                <StatCard variant="bold" tone="emerald"
                          label={t(lang, 'reports.income')}
                          value={`${currency} ${occData.totalRevenue.toLocaleString()}`}
                          Icon={CreditCard} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
                  <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-black uppercase tracking-widest text-slate-500 text-xs">{t(lang, 'reports.roomPerformance')}</span>
                    <Layout size={20} className="text-slate-300" />
                  </div>
                  <div className="flex-1 overflow-auto max-h-96 scrollbar-hide">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr className="text-[10px] font-black uppercase tracking-widest">
                          <th className="px-6 py-4 text-start">{t(lang, 'reports.room')}</th>
                          <th className="px-6 py-4 text-end">{t(lang, 'reports.revenue')}</th>
                          <th className="px-6 py-4 text-end">{t(lang, 'reports.deposit')}</th>
                          <th className="px-6 py-4 text-end">{t(lang, 'reports.remaining')}</th>
                          <th className="px-6 py-4 text-end">{t(lang, 'reports.expenses')}</th>
                          <th className="px-6 py-4 text-center">{t(lang, 'reports.occupancy')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {occData.roomStats.map((s) => {
                          const exp = occData.expensesByRoom[s.roomId] || 0;
                          const dep = s.totalDeposit ?? 0;
                          const rem = s.totalRemaining ?? 0;
                          return (
                            <tr key={s.roomId} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-5 font-black text-slate-900 text-lg">{s.roomName || s.roomId}</td>
                              <td className="px-6 py-5 text-end text-emerald-600 font-black">
                                {currency} {s.totalRevenue.toLocaleString()}
                              </td>
                              <td className={`px-6 py-5 text-end font-black ${dep > 0 ? 'text-emerald-700' : 'text-slate-300'}`}>
                                {currency} {dep.toLocaleString()}
                              </td>
                              <td className={`px-6 py-5 text-end font-black ${rem > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                                {currency} {rem.toLocaleString()}
                              </td>
                              <td className={`px-6 py-5 text-end font-black ${exp > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                                {currency} {exp.toLocaleString()}
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex items-center justify-center gap-3">
                                  <div className="flex-1 max-w-[100px] bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
                                    <div
                                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-1000"
                                      style={{ width: `${Math.min(100, s.occupancyRate).toFixed(0)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-black text-slate-400 w-10 text-end">{s.occupancyRate.toFixed(0)}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
                  <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-black uppercase tracking-widest text-slate-500 text-xs">{t(lang, 'reports.monthlyFillRate')}</span>
                    <ChartPie size={20} className="text-slate-300" />
                  </div>
                  <div className="flex-1 overflow-auto max-h-96 scrollbar-hide">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr className="text-[10px] font-black uppercase tracking-widest">
                          <th className="px-8 py-4 text-start">{t(lang, 'reports.month')}</th>
                          <th className="px-8 py-4 text-end">{t(lang, 'reports.revenue')}</th>
                          <th className="px-8 py-4 text-center">{t(lang, 'reports.fillRate')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {occData.monthlyStats.map((s, i: number) => (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="px-8 py-5 font-black text-slate-900">{s.month}</td>
                            <td className="px-8 py-5 text-end text-emerald-600 font-black">
                              {currency} {s.revenue.toLocaleString()}
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex items-center justify-center gap-3">
                                <div className="flex-1 max-w-[100px] bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
                                  <div
                                    className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-1000"
                                    style={{ width: `${Math.min(100, s.fillRate).toFixed(0)}%` }}
                                  />
                                </div>
                                <span className="text-xs font-black text-slate-400 w-10 text-end">{s.fillRate.toFixed(0)}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Annual Occupancy Heatmap — full year for the selected year */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Calendar size={18} weight="duotone" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">
                        {lang === 'ar' ? 'خريطة الإشغال السنوية' : lang === 'tr' ? 'Yıllık Doluluk Haritası' : 'Annual Occupancy Heatmap'}
                      </p>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                        {lang === 'ar' ? 'إشغال كل غرفة لكل شهر' : lang === 'tr' ? 'Her oda, her ay' : 'Per room · per month'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Chart / Table toggle */}
                    <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                      <button
                        onClick={() => setHeatmapMode('chart')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${heatmapMode === 'chart' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                        <ChartBar size={13} weight="bold" />
                        {lang === 'ar' ? 'مخطط' : lang === 'tr' ? 'Grafik' : 'Chart'}
                      </button>
                      <button
                        onClick={() => setHeatmapMode('table')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${heatmapMode === 'table' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                        <Table size={13} weight="bold" />
                        {lang === 'ar' ? 'جدول' : lang === 'tr' ? 'Tablo' : 'Table'}
                      </button>
                    </div>
                  </div>
                </div>

                {heatmapLoading && yearlyOccupancy.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 text-sm font-bold">
                    {lang === 'ar' ? 'جاري التحميل…' : lang === 'tr' ? 'Yükleniyor…' : 'Loading…'}
                  </div>
                ) : yearlyOccupancy.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 text-sm font-bold">
                    {lang === 'ar'
                      ? 'لا توجد بيانات بعد. سيتم حساب الإشغال تلقائياً.'
                      : lang === 'tr'
                      ? 'Henüz veri yok. Doluluk otomatik hesaplanacak.'
                      : 'No data yet — occupancy will be computed automatically by the monthly cron.'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    {heatmapMode === 'chart'
                      ? <HeatmapChart data={yearlyOccupancy} lang={lang} />
                      : <HeatmapGrid data={yearlyOccupancy} lang={lang} />
                    }
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const MONTHS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function occupancyCell(rate: number): string {
  if (rate >= 0.76) return 'bg-emerald-700 text-white';
  if (rate >= 0.51) return 'bg-emerald-500 text-white';
  if (rate >= 0.26) return 'bg-emerald-200 text-emerald-900';
  if (rate > 0)     return 'bg-emerald-50 text-emerald-700';
  return 'bg-slate-50 text-slate-300';
}

function occupancyCellBg(rate: number): string {
  if (rate >= 0.76) return 'bg-emerald-700';
  if (rate >= 0.51) return 'bg-emerald-500';
  if (rate >= 0.26) return 'bg-emerald-200';
  if (rate > 0)     return 'bg-emerald-50';
  return 'bg-slate-100';
}

function HeatmapGrid({ data, lang }: {
  data: { roomId: string; roomName: string; month: number; occupiedNights: number; totalNights: number; occupancyRate: number }[];
  lang: Language;
}) {
  const months = lang === 'ar' ? MONTHS_AR : lang === 'tr' ? MONTHS_TR : MONTHS_EN;
  const roomIds = [...new Set(data.map(d => d.roomId))];
  const byRoomMonth: Record<string, Record<number, typeof data[0]>> = {};
  data.forEach(d => {
    if (!byRoomMonth[d.roomId]) byRoomMonth[d.roomId] = {};
    byRoomMonth[d.roomId][d.month] = d;
  });
  const roomName = (id: string) => data.find(d => d.roomId === id)?.roomName ?? id;

  return (
    <table className="w-full text-xs min-w-[640px]">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-100">
          <th className="px-4 py-3 text-start text-[10px] font-black uppercase tracking-widest text-slate-400 w-28">
            {lang === 'ar' ? 'الغرفة' : lang === 'tr' ? 'Oda' : 'Room'}
          </th>
          {months.map((m, i) => (
            <th key={i} className="px-2 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">{m}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {roomIds.map(roomId => (
          <tr key={roomId} className="hover:bg-slate-50/50 transition-colors">
            <td className="px-4 py-2.5 font-black text-slate-700 text-xs">{roomName(roomId)}</td>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
              const cell = byRoomMonth[roomId]?.[month];
              const rate = cell?.occupancyRate ?? 0;
              const pct = Math.round(rate * 100);
              return (
                <td
                  key={month}
                  title={cell ? `${cell.occupiedNights}/${cell.totalNights} nights (${pct}%)` : '—'}
                  className="px-1 py-2"
                >
                  <div className={`rounded-lg text-center py-1.5 font-black tabular-nums text-[11px] ${occupancyCell(rate)}`}>
                    {cell ? `${pct}%` : '—'}
                  </div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function HeatmapChart({ data, lang }: {
  data: { roomId: string; roomName: string; month: number; occupiedNights: number; totalNights: number; occupancyRate: number }[];
  lang: Language;
}) {
  const months = lang === 'ar' ? MONTHS_AR : lang === 'tr' ? MONTHS_TR : MONTHS_EN;
  const roomIds = [...new Set(data.map(d => d.roomId))];
  const byRoomMonth: Record<string, Record<number, typeof data[0]>> = {};
  data.forEach(d => {
    if (!byRoomMonth[d.roomId]) byRoomMonth[d.roomId] = {};
    byRoomMonth[d.roomId][d.month] = d;
  });
  const roomName = (id: string) => data.find(d => d.roomId === id)?.roomName ?? id;

  return (
    <table className="w-full text-xs min-w-[640px]">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-100">
          <th className="px-4 py-3 text-start text-[10px] font-black uppercase tracking-widest text-slate-400 w-28">
            {lang === 'ar' ? 'الغرفة' : lang === 'tr' ? 'Oda' : 'Room'}
          </th>
          {months.map((m, i) => (
            <th key={i} className="px-1 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">{m}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {roomIds.map(roomId => (
          <tr key={roomId} className="hover:bg-slate-50/50 transition-colors">
            <td className="px-4 py-2 font-black text-slate-700 text-xs align-bottom">{roomName(roomId)}</td>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
              const cell = byRoomMonth[roomId]?.[month];
              const rate = cell?.occupancyRate ?? 0;
              const pct = Math.round(rate * 100);
              const bgClass = occupancyCellBg(rate);
              return (
                <td
                  key={month}
                  title={cell ? `${cell.occupiedNights}/${cell.totalNights} nights (${pct}%)` : '—'}
                  className="px-1 py-2 align-bottom"
                >
                  <div className="flex flex-col items-center gap-0.5 h-20 justify-end">
                    <span className="text-[10px] font-bold text-slate-400 tabular-nums">{cell ? `${pct}%` : ''}</span>
                    <div
                      className={`w-full rounded-t-md ${bgClass} transition-all duration-500`}
                      style={{ height: cell ? `${Math.max(4, pct)}%` : '2px' }}
                    />
                  </div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Unified stat card. Same anatomy across the entire reports page:
//   - rounded-2xl surface, fixed min-height, ample padding
//   - small icon + uppercase label aligned at top
//   - giant tabular number aligned at bottom
//   - oversized faint icon watermark in the corner
// `variant` only swaps the surface treatment (soft pastel vs bold filled);
// the layout is identical so the row of pastel + the row of bold reads as
// one design language.
type StatTone = 'blue' | 'rose' | 'emerald' | 'amber' | 'slate' | 'indigo';
type StatVariant = 'pastel' | 'bold';

const TONE_PASTEL: Record<StatTone, { bg: string; border: string; label: string; value: string; watermark: string }> = {
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-100',    label: 'text-blue-600',    value: 'text-blue-700',    watermark: 'text-blue-200' },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-100',    label: 'text-rose-600',    value: 'text-rose-700',    watermark: 'text-rose-200' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', label: 'text-emerald-600', value: 'text-emerald-700', watermark: 'text-emerald-200' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-100',   label: 'text-amber-600',   value: 'text-amber-700',   watermark: 'text-amber-200' },
  slate:   { bg: 'bg-slate-50',   border: 'border-slate-100',   label: 'text-slate-600',   value: 'text-slate-700',   watermark: 'text-slate-200' },
  indigo:  { bg: 'bg-indigo-50',  border: 'border-indigo-100',  label: 'text-indigo-600',  value: 'text-indigo-700',  watermark: 'text-indigo-200' },
};

const TONE_BOLD: Record<StatTone, { bg: string }> = {
  blue:    { bg: 'bg-blue-600' },
  rose:    { bg: 'bg-rose-600' },
  emerald: { bg: 'bg-emerald-600' },
  amber:   { bg: 'bg-amber-500' },
  slate:   { bg: 'bg-slate-900' },
  indigo:  { bg: 'bg-indigo-600' },
};

function StatCard({
  variant, tone, label, value, Icon,
}: {
  variant: StatVariant;
  tone: StatTone;
  label: string;
  value: string;
  Icon: any;
}) {
  if (variant === 'pastel') {
    const p = TONE_PASTEL[tone];
    return (
      <div className={`${p.bg} ${p.border} border rounded-2xl p-6 sm:p-7 relative overflow-hidden min-h-[160px] flex flex-col justify-between`}>
        <div className={`absolute -top-3 -end-2 ${p.watermark} opacity-50 pointer-events-none`}>
          <Icon size={120} weight="duotone" />
        </div>
        <div className={`flex items-center gap-2 ${p.label} relative z-10`}>
          <Icon size={18} weight="duotone" />
          <span className="text-xs font-black uppercase tracking-widest">{label}</span>
        </div>
        <div className={`text-3xl sm:text-4xl font-black tabular-nums tracking-tighter ${p.value} relative z-10`} dir="ltr">
          {value}
        </div>
      </div>
    );
  }
  const b = TONE_BOLD[tone];
  return (
    <div className={`${b.bg} rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden min-h-[150px] flex flex-col justify-between`}>
      <div className="absolute -bottom-4 -end-4 text-white/10 pointer-events-none">
        <Icon size={130} weight="fill" />
      </div>
      <div className="flex items-center gap-2 text-white/75 relative z-10">
        <Icon size={16} weight="bold" />
        <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-4xl sm:text-5xl font-black tabular-nums tracking-tighter relative z-10 mt-3" dir="ltr">
        {value}
      </div>
    </div>
  );
}
