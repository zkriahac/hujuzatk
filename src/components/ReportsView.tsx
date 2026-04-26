import { useEffect, useMemo, useState } from 'react';
import { Layout, ChartPie, CreditCard, Calendar, Users, Target, FileXls, TrendDown, Scales, CaretDown } from 'phosphor-react';
import { t, type Language } from '../lib/i18n';
import { apolloClient } from '../lib/apolloClient';
import { GET_EXPENSES_QUERY } from '../lib/graphql';

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
  currency,
  lang,
  tenantName,
}: ReportsViewProps) {
  const avgFill =
    reportData.roomStats.length === 0
      ? 0
      : reportData.roomStats.reduce((a: any, b: any) => a + b.occupancyRate, 0) / reportData.roomStats.length;

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
  const expensesByRoom = useMemo(() => {
    const m: Record<string, number> = {};
    expenses.forEach((e) => {
      const key = e.roomId || '__general__';
      m[key] = (m[key] || 0) + e.amount;
    });
    return m;
  }, [expenses]);
  const expensesByCategory = useMemo(() => {
    const m: Record<string, number> = {};
    expenses.forEach((e) => { m[e.category] = (m[e.category] || 0) + e.amount; });
    return m;
  }, [expenses]);

  // Dynamic-import xlsx so it only loads when the user clicks Export
  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    // Sheet 1: Summary
    const summaryRows = [
      ['Hujuzatk Report', tenantName || ''],
      ['Range', `${reportStartDate} → ${reportEndDate}`],
      ['Room filter', reportRoomFilter === 'ALL' ? 'All' : reportRoomFilter],
      [],
      ['Total revenue', reportData.totalRevenue],
      ['Total expenses', totalExpenses],
      ['Net income', netIncome],
      ['Total nights', reportData.totalNights],
      ['Bookings', reportData.bookingCount],
      ['Avg fill rate %', avgFill.toFixed(2)],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary');
    // Sheet 2: Per-room
    const roomMap = Object.fromEntries(rooms.map((r: any) => [r.id, r.name]));
    const perRoom = [['Room', 'Revenue', 'Expenses', 'Net', 'Occupancy %']];
    reportData.roomStats.forEach((s: any) => {
      const exp = expensesByRoom[s.roomId] || 0;
      perRoom.push([s.roomName || s.roomId, s.totalRevenue, exp, s.totalRevenue - exp, s.occupancyRate.toFixed(1)]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(perRoom), 'Per-room');
    // Sheet 3: Expenses
    const expSheet = [['Date', 'Room', 'Category', 'Reason', 'Amount']];
    expenses.forEach((e) => {
      expSheet.push([
        e.date.split('T')[0],
        e.roomId ? (roomMap[e.roomId] || e.roomId) : 'General',
        e.category,
        e.reason,
        String(e.amount),
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expSheet), 'Expenses');
    // Sheet 4: Monthly
    const monthly = [['Month', 'Revenue', 'Fill rate %']];
    reportData.monthlyStats.forEach((s: any) => monthly.push([s.month, s.revenue, s.fillRate.toFixed(1)]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(monthly), 'Monthly');
    XLSX.writeFile(wb, `hujuzatk-report-${(tenantName || 'tenant').replace(/\s+/g, '_')}-${reportStartDate}-${reportEndDate}.xlsx`);
  };

  // Friendly tokens used here:
  //   pill controls          → rounded-full
  //   ample whitespace       → p-7/p-8 cards, gap-6/8
  //   soft pastels (P&L row) → bg-{tone}-50/100, border-{tone}-100
  //   bold filled (KPI row)  → bg-{tone}-{500/600/900}, text-white
  //   12-color steps from the Friendly spec drive primary/secondary/danger/success
  return (
    <div className="space-y-7 pb-12">
      {/* Filter card — pill-shaped controls in one airy white surface */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 sm:p-7">
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
            className="bg-emerald-600 text-white px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2 shadow-sm"
          >
            <FileXls size={18} weight="bold" /> {t(lang, 'reports.exportExcel')}
          </button>
        </div>
      </div>

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

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard variant="bold" tone="blue"
                  label={t(lang, 'reports.totalNights')}
                  value={String(reportData.totalNights)}
                  Icon={Calendar} />
        <StatCard variant="bold" tone="indigo"
                  label={t(lang, 'reports.totalBookings')}
                  value={String(reportData.bookingCount)}
                  Icon={Users} />
        <StatCard variant="bold" tone="amber"
                  label={t(lang, 'reports.avgFillRate')}
                  value={`${avgFill.toFixed(1)}%`}
                  Icon={Target} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col">
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
                  <th className="px-6 py-4 text-end">{t(lang, 'reports.expenses')}</th>
                  <th className="px-6 py-4 text-center">{t(lang, 'reports.occupancy')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reportData.roomStats.map((s: any) => {
                  const exp = expensesByRoom[s.roomId] || 0;
                  return (
                    <tr key={s.roomId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-5 font-black text-slate-900 text-lg">{s.roomName || s.roomId}</td>
                      <td className="px-6 py-5 text-end text-emerald-600 font-black">
                        {currency} {s.totalRevenue.toLocaleString()}
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

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col">
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
                {reportData.monthlyStats.map((s: any, i: number) => (
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
    </div>
  );
}

// Unified stat card. Same anatomy across the entire reports page:
//   - rounded-[2rem] surface, fixed min-height, ample padding
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
      <div className={`${p.bg} ${p.border} border rounded-[2rem] p-6 sm:p-7 relative overflow-hidden min-h-[160px] flex flex-col justify-between`}>
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
    <div className={`${b.bg} rounded-[2rem] p-6 sm:p-8 text-white relative overflow-hidden min-h-[150px] flex flex-col justify-between`}>
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
