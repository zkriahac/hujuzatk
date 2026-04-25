import { useEffect, useMemo, useState } from 'react';
import { FileText, Layout, ChartPie, CreditCard, Calendar, Users, Target, FileXls, TrendDown, Scales } from 'phosphor-react';
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

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap gap-6 items-end">
          <div className="flex flex-col gap-2 w-full md:w-auto flex-1">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t(lang, 'reports.type')}</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as 'stay' | 'created')}
              className="border-slate-100 rounded-2xl px-4 py-2 text-sm font-black bg-slate-50 focus:ring-2 focus:ring-emerald-500 transition-all"
            >
              <option value="stay">{t(lang, 'reports.stayDate')}</option>
              <option value="created">{t(lang, 'reports.createdDate')}</option>
            </select>
          </div>
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t(lang, 'reports.fromDate')}</label>
            <input
              type="date"
              value={reportStartDate}
              onChange={(e) => setReportStartDate(e.target.value)}
              className="border-slate-100 rounded-2xl px-4 py-3 text-sm font-black bg-slate-50"
            />
          </div>
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t(lang, 'reports.toDate')}</label>
            <input
              type="date"
              value={reportEndDate}
              onChange={(e) => setReportEndDate(e.target.value)}
              className="border-slate-100 rounded-2xl px-4 py-3 text-sm font-black bg-slate-50"
            />
          </div>
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t(lang, 'reports.roomFilter')}</label>
            <select
              value={reportRoomFilter}
              onChange={(e) => setReportRoomFilter(e.target.value)}
              className="border-slate-100 rounded-2xl px-4 py-2 text-sm font-black bg-slate-50"
            >
              <option value="ALL">{t(lang, 'reports.allRooms')}</option>
              {rooms.map((r: any) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-auto flex gap-2">
            <button
              onClick={handleExportExcel}
              className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2"
            >
              <FileXls size={18} weight="bold" /> {t(lang, 'reports.exportExcel')}
            </button>
            <button
              onClick={() => window.print()}
              className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2"
            >
              <FileText size={18} weight="bold" /> {t(lang, 'reports.print')}
            </button>
          </div>
        </div>
      </div>

      {/* P&L summary row — revenue / expenses / net */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6">
          <div className="flex items-center gap-2 text-emerald-700 mb-2">
            <CreditCard size={20} weight="duotone" />
            <span className="text-[10px] font-black uppercase tracking-widest">{t(lang, 'reports.income')}</span>
          </div>
          <div className="text-3xl font-black text-emerald-900 tabular-nums" dir="ltr">
            {currency} {reportData.totalRevenue.toLocaleString()}
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-3xl p-6">
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <TrendDown size={20} weight="duotone" />
            <span className="text-[10px] font-black uppercase tracking-widest">{t(lang, 'reports.expenses')}</span>
          </div>
          <div className="text-3xl font-black text-red-900 tabular-nums" dir="ltr">
            {currency} {totalExpenses.toLocaleString()}
          </div>
        </div>
        <div className={`${netIncome >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-300'} border rounded-3xl p-6`}>
          <div className={`flex items-center gap-2 ${netIncome >= 0 ? 'text-blue-700' : 'text-amber-700'} mb-2`}>
            <Scales size={20} weight="duotone" />
            <span className="text-[10px] font-black uppercase tracking-widest">{t(lang, 'reports.netIncome')}</span>
          </div>
          <div className={`text-3xl font-black tabular-nums ${netIncome >= 0 ? 'text-blue-900' : 'text-amber-900'}`} dir="ltr">
            {currency} {netIncome.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { bg: 'bg-emerald-600', shadow: 'shadow-emerald-100', Icon: CreditCard, label: t(lang, 'reports.totalRevenue'), value: `${currency} ${reportData.totalRevenue.toLocaleString()}` },
          { bg: 'bg-blue-600', shadow: 'shadow-blue-100', Icon: Calendar, label: t(lang, 'reports.totalNights'), value: String(reportData.totalNights) },
          { bg: 'bg-slate-900', shadow: 'shadow-slate-200', Icon: Users, label: t(lang, 'reports.totalBookings'), value: String(reportData.bookingCount) },
          { bg: 'bg-amber-500', shadow: 'shadow-amber-100', Icon: Target, label: t(lang, 'reports.avgFillRate'), value: `${avgFill.toFixed(1)}%` },
        ].map(({ bg, shadow, Icon, label, value }) => (
          <div key={label} className={`${bg} p-8 rounded-[2.5rem] text-white shadow-xl ${shadow} relative overflow-hidden group`}>
            <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-all">
              <Icon size={120} weight="duotone" />
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 relative z-10">{label}</div>
            <div className="text-4xl font-black mt-2 tracking-tighter relative z-10">{value}</div>
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
