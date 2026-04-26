import { useEffect, useMemo, useState } from 'react';
import { Layout, ChartPie, CreditCard, Calendar, Users, Target, FileXls, TrendDown, Scales } from 'phosphor-react';
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
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as 'stay' | 'created')}
              className="w-full bg-slate-50 border border-slate-100 rounded-full px-5 py-2.5 pe-10 text-sm font-black focus:ring-2 focus:ring-emerald-500 transition-all"
            >
              <option value="stay">{t(lang, 'reports.stayDate')}</option>
              <option value="created">{t(lang, 'reports.createdDate')}</option>
            </select>
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
            <select
              value={reportRoomFilter}
              onChange={(e) => setReportRoomFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-full px-5 py-2.5 pe-10 text-sm font-black focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">{t(lang, 'reports.allRooms')}</option>
              {rooms.map((r: any) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
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

      {/* P&L summary row — soft pastel cards (Friendly: rounded, ample whitespace, low-contrast surfaces with high-contrast figures) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <PastelCard
          tone="blue"
          label={t(lang, 'reports.netIncome')}
          value={`${currency} ${netIncome.toLocaleString()}`}
          Icon={Scales}
          isRtl={lang === 'ar'}
          negative={netIncome < 0}
        />
        <PastelCard
          tone="rose"
          label={t(lang, 'reports.expenses')}
          value={`${currency} ${totalExpenses.toLocaleString()}`}
          Icon={TrendDown}
          isRtl={lang === 'ar'}
        />
        <PastelCard
          tone="emerald"
          label={t(lang, 'reports.income')}
          value={`${currency} ${reportData.totalRevenue.toLocaleString()}`}
          Icon={CreditCard}
          isRtl={lang === 'ar'}
        />
      </div>

      {/* KPI row — bold filled cards for headline numbers, white text, faint background icon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { bg: 'bg-amber-500',  Icon: Target,    label: t(lang, 'reports.avgFillRate'),    value: `${avgFill.toFixed(1)}%` },
          { bg: 'bg-slate-900',  Icon: Users,     label: t(lang, 'reports.totalBookings'),  value: String(reportData.bookingCount) },
          { bg: 'bg-blue-600',   Icon: Calendar,  label: t(lang, 'reports.totalNights'),    value: String(reportData.totalNights) },
          { bg: 'bg-emerald-600',Icon: CreditCard,label: t(lang, 'reports.totalRevenue'),   value: `${currency} ${reportData.totalRevenue.toLocaleString()}` },
        ].map(({ bg, Icon, label, value }) => (
          <div key={label} className={`${bg} p-7 rounded-[2rem] text-white relative overflow-hidden group min-h-[150px] flex flex-col justify-end`}>
            <div className="absolute -top-4 -right-2 opacity-20 group-hover:opacity-30 transition-opacity">
              <Icon size={130} weight="duotone" />
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.25em] opacity-80 relative z-10">{label}</div>
            <div className="text-3xl sm:text-4xl font-black mt-1 tracking-tighter relative z-10 tabular-nums" dir="ltr">{value}</div>
          </div>
        ))}
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
                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                  <th className="px-8 py-4 text-left">{t(lang, 'reports.room')}</th>
                  <th className="px-8 py-4 text-right">{t(lang, 'reports.revenue')}</th>
                  <th className="px-8 py-4 text-center">{t(lang, 'reports.occupancy')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reportData.roomStats.map((s: any) => (
                  <tr key={s.roomId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-5 font-black text-slate-900 text-lg">{s.roomName || s.roomId}</td>
                    <td className="px-8 py-5 text-right text-emerald-600 font-black">
                      {currency} {s.totalRevenue.toLocaleString()}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center justify-center gap-3">
                        <div className="flex-1 max-w-[100px] bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(100, s.occupancyRate).toFixed(0)}%` }}
                          />
                        </div>
                        <span className="text-xs font-black text-slate-400 w-10 text-right">{s.occupancyRate.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
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
                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                  <th className="px-8 py-4 text-left">{t(lang, 'reports.month')}</th>
                  <th className="px-8 py-4 text-right">{t(lang, 'reports.revenue')}</th>
                  <th className="px-8 py-4 text-center">{t(lang, 'reports.fillRate')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reportData.monthlyStats.map((s: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-5 font-black text-slate-900">{s.month}</td>
                    <td className="px-8 py-5 text-right text-emerald-600 font-black">
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
                        <span className="text-xs font-black text-slate-400 w-10 text-right">{s.fillRate.toFixed(0)}%</span>
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

// Friendly pastel summary tile — soft surface with a small icon at the corner and a giant number.
// Tone keys map onto the Friendly palette tokens (primary=rose, secondary=mint, info=blue).
function PastelCard({
  tone, label, value, Icon, isRtl, negative,
}: {
  tone: 'blue' | 'rose' | 'emerald';
  label: string;
  value: string;
  Icon: any;
  isRtl: boolean;
  negative?: boolean;
}) {
  const palette = {
    blue:    { bg: 'bg-blue-50',    border: 'border-blue-100',    label: 'text-blue-600',    value: 'text-blue-700',    icon: 'text-blue-300' },
    rose:    { bg: 'bg-rose-50',    border: 'border-rose-100',    label: 'text-rose-600',    value: 'text-rose-700',    icon: 'text-rose-300' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', label: 'text-emerald-600', value: 'text-emerald-700', icon: 'text-emerald-300' },
  }[tone];
  // Override blue with amber when negative (loss month)
  const effective = negative
    ? { bg: 'bg-amber-50', border: 'border-amber-100', label: 'text-amber-600', value: 'text-amber-700', icon: 'text-amber-300' }
    : palette;
  return (
    <div className={`${effective.bg} ${effective.border} border rounded-[2rem] p-6 sm:p-7 relative overflow-hidden min-h-[150px] flex flex-col`}>
      <div className={`flex items-center gap-2 ${effective.label} mb-1`}>
        <Icon size={20} weight="duotone" className={effective.icon} />
        <span className="text-xs font-black uppercase tracking-widest">{label}</span>
      </div>
      <div className={`text-3xl sm:text-4xl font-black tabular-nums tracking-tighter ${effective.value} mt-2`} dir="ltr">
        {value}
      </div>
    </div>
  );
}
