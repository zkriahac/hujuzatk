import { X, ArrowsClockwise, CheckCircle, WarningCircle, XCircle } from 'phosphor-react';
import { cn } from '../utils/cn';
import { t, type Language } from '../lib/i18n';

export interface SkipBreakdownRow {
  reason: string; // 'lookback' | 'block' | 'duplicate_reservation_id' | 'zero_nights'
  count: number;
}

export interface SyncResultRow {
  integrationId?: string;
  channelName: string;
  roomId: string;
  imported: number;
  updated: number;
  canceled: number;
  skipped: number;
  skipReasons?: SkipBreakdownRow[];
  blocksRemoved: number;
  errors: string[];
  success: boolean;
  message: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  results: SyncResultRow[];
  rooms: Array<{ id: string; name: string }>;
  lang: Language;
  isRtl: boolean;
}

export default function SyncResultModal({ open, onClose, results, rooms, lang, isRtl }: Props) {
  if (!open) return null;

  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name || id;

  const totals = results.reduce(
    (acc, r) => ({
      imported: acc.imported + r.imported,
      updated: acc.updated + r.updated,
      canceled: acc.canceled + r.canceled,
      skipped: acc.skipped + r.skipped,
      blocksRemoved: acc.blocksRemoved + r.blocksRemoved,
      errors: acc.errors + r.errors.length,
      failed: acc.failed + (r.success ? 0 : 1),
    }),
    { imported: 0, updated: 0, canceled: 0, skipped: 0, blocksRemoved: 0, errors: 0, failed: 0 },
  );

  const allSucceeded = results.every((r) => r.success) && totals.errors === 0;
  const noChanges = totals.imported === 0 && totals.updated === 0 && totals.canceled === 0 && totals.blocksRemoved === 0;

  // Aggregate skip reasons across all integrations so a host who sees
  // "skipped: 12" can tell whether those were old bookings outside the
  // sync window, blocked dates, duplicates, or invalid same-day events.
  const skipReasonTotals = results.reduce<Record<string, number>>((acc, r) => {
    for (const s of r.skipReasons ?? []) acc[s.reason] = (acc[s.reason] || 0) + s.count;
    return acc;
  }, {});
  const skipReasonRows = Object.entries(skipReasonTotals)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div
      className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn(
              'grid place-items-center w-10 h-10 rounded-full shrink-0',
              allSucceeded ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600',
            )}>
              {allSucceeded ? <CheckCircle size={22} weight="fill" /> : <WarningCircle size={22} weight="fill" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-slate-900 leading-tight">
                {t(lang, 'sync.resultTitle')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {results.length} {t(lang, 'sync.integrationsProcessed')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 shrink-0" aria-label="Close">
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Totals — only show non-zero metrics */}
        <div className="px-5 pb-3 grid grid-cols-2 gap-2">
          {totals.imported > 0 && (
            <Stat label={t(lang, 'sync.imported')} value={totals.imported} tone="emerald" />
          )}
          {totals.updated > 0 && (
            <Stat label={t(lang, 'sync.updated')} value={totals.updated} tone="blue" />
          )}
          {totals.canceled > 0 && (
            <Stat label={t(lang, 'sync.canceled')} value={totals.canceled} tone="rose" />
          )}
          {totals.blocksRemoved > 0 && (
            <Stat label={t(lang, 'sync.blocksRemoved')} value={totals.blocksRemoved} tone="amber" />
          )}
          {totals.skipped > 0 && (
            <Stat label={t(lang, 'sync.skipped')} value={totals.skipped} tone="slate" />
          )}
          {totals.errors > 0 && (
            <Stat label={t(lang, 'sync.errors')} value={totals.errors} tone="rose" />
          )}
          {noChanges && totals.errors === 0 && (
            <div className="col-span-2 text-center py-3 text-sm font-bold text-slate-400">
              {t(lang, 'sync.noChanges')}
            </div>
          )}
        </div>

        {/* Why-skipped breakdown — only when something was skipped. Tells the
            host whether a "missing" booking was outside the sync window, a
            blocked date, a duplicate, or an invalid same-day event. */}
        {skipReasonRows.length > 0 && (
          <div className="px-5 pb-3">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                {t(lang, 'sync.skipBreakdownTitle')}
              </div>
              <div className="space-y-1.5">
                {skipReasonRows.map(([reason, count]) => (
                  <div key={reason} className="flex items-start justify-between gap-3 text-xs">
                    <span className="text-slate-600 leading-snug">
                      {t(lang, `sync.skipReason.${reason}`)}
                    </span>
                    <span className="font-black tabular-nums text-slate-700 shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Per-integration breakdown is shown ONLY when something failed — the totals
            above already give a clean "brief" view that's enough for normal success.
            Listing every (channel, room) row when nothing went wrong is just noise. */}
        {!allSucceeded && (
          <div className="border-t border-slate-100 px-3 py-3 space-y-2">
            {results.filter((r) => !r.success || r.errors.length > 0).map((r, i) => (
              <div
                key={`${r.integrationId ?? i}-${i}`}
                className="rounded-xl border bg-rose-50 border-rose-100 p-3"
              >
                <div className="flex items-center gap-2">
                  <XCircle size={16} weight="fill" className="shrink-0 text-rose-500" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-700 truncate">
                    {r.channelName} · {roomName(r.roomId)}
                  </span>
                </div>
                {r.errors.length > 0 ? (
                  <div className="mt-2 text-xs text-rose-700 font-semibold">
                    {r.errors.slice(0, 2).join('; ')}
                    {r.errors.length > 2 && ` +${r.errors.length - 2} more`}
                  </div>
                ) : r.message ? (
                  <div className="mt-2 text-xs text-rose-700 font-semibold">{r.message}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full bg-slate-900 text-white font-black text-sm py-3 rounded-2xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowsClockwise size={14} weight="bold" />
            {t(lang, 'sync.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'blue' | 'rose' | 'amber' | 'slate' }) {
  const toneClass = {
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    rose: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-50 text-slate-600',
  }[tone];
  return (
    <div className={cn('rounded-xl px-3 py-2.5', toneClass)}>
      <div className="text-2xl font-black tabular-nums leading-none">{value}</div>
      <div className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-80">{label}</div>
    </div>
  );
}
