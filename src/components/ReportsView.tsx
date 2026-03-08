import { FileText, Layout, ChartPie, CreditCard, Calendar, Users, Target } from 'phosphor-react';
import { t, type Language } from '../lib/i18n';

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
}: ReportsViewProps) {
  const avgFill =
    reportData.roomStats.length === 0
      ? 0
      : reportData.roomStats.reduce((a: any, b: any) => a + b.occupancyRate, 0) / reportData.roomStats.length;

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
          <div className="w-full md:w-auto">
            <button
              onClick={() => window.print()}
              className="w-full bg-slate-900 text-white px-8 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-95 flex items-center gap-2 justify-center"
            >
              <FileText size={18} weight="bold" /> {t(lang, 'reports.print')}
            </button>
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
                    <td className="px-8 py-5 font-black text-slate-900 text-lg">{s.roomId}</td>
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
