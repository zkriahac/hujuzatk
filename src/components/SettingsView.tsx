import { useState } from 'react';
import { Globe, Layout, X, CurrencyDollar, Buildings, Crown, Check, Calendar, Upload } from 'phosphor-react';
import { authService } from '../lib/authService';
import type { SessionUser } from '../lib/authService';
import { t, type Language } from '../lib/i18n';
import { trackLanguageChange, setAnalyticsUser } from '../lib/analytics';
import type { Tenant } from '../db';
import { apolloClient } from '../lib/apolloClient';
import { UPDATE_TENANT_SETTINGS_MUTATION } from '../lib/graphql';
import { ImportBookingsModal } from './Modals';
import { PLANS, type PlanKey, isUnlimited } from '../lib/planConfig';
import { formatTz } from '../utils/formatTz';
import { cn } from '../utils/cn';

interface CompanyForm {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyTaxId: string;
  companyLogoUrl: string;
  invoiceFooter: string;
}

const TIMEZONES = [
  'Asia/Muscat', 'Asia/Riyadh', 'Asia/Dubai', 'Asia/Kuwait', 'Asia/Qatar', 'Asia/Amman',
  'Asia/Jerusalem', 'Africa/Cairo', 'Europe/Istanbul', 'Europe/London', 'Europe/Paris',
  'America/New_York', 'America/Chicago', 'UTC',
];

interface SettingsViewProps {
  session: SessionUser;
  onSessionChange: (s: SessionUser | null) => void;
  lang: Language;
}

export default function SettingsView({ session, onSessionChange, lang }: SettingsViewProps) {
  const [tenant, setTenant] = useState<Tenant>(session.tenant);
  const [saving, setSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [defaultNightPrice, setDefaultNightPrice] = useState<number>(session.tenant.defaultNightPrice ?? 50);
  const [defaultTax, setDefaultTax] = useState<number>(session.tenant.defaultTax ?? 0);
  const [company, setCompany] = useState<CompanyForm>({
    companyName: session.tenant.companyName ?? '',
    companyAddress: session.tenant.companyAddress ?? '',
    companyPhone: session.tenant.companyPhone ?? '',
    companyEmail: session.tenant.companyEmail ?? '',
    companyTaxId: session.tenant.companyTaxId ?? '',
    companyLogoUrl: session.tenant.companyLogoUrl ?? '',
    invoiceFooter: session.tenant.invoiceFooter ?? '',
  });

  const handleRoomChange = (index: number, value: string) => {
    const rooms = [...(tenant.rooms || [])];
    rooms[index] = { ...rooms[index], name: value };
    setTenant({ ...tenant, rooms });
  };

  const handleAddRoom = () => {
    const rooms = [...(tenant.rooms || [])];
    const nextNum = rooms.length + 1;
    const id = `r${nextNum}`;
    rooms.push({ id, name: `Room ${nextNum}` });
    setTenant({ ...tenant, rooms });
  };

  const handleRemoveRoom = (index: number) => {
    const rooms = [...(tenant.rooms || [])].filter((_, i) => i !== index);
    setTenant({ ...tenant, rooms });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const langChanged = tenant.language !== session.tenant.language;
      const updated = await authService.updateTenantConfig(tenant.uuid, {
        language: tenant.language,
        currency: tenant.currency,
        timezone: tenant.timezone,
        rooms: tenant.rooms,
      });
      if (langChanged && tenant.language) {
        trackLanguageChange(tenant.language);
        setAnalyticsUser({ language: tenant.language });
      }

      // Save default + company settings together. Empty strings clear the field.
      await apolloClient.mutate({
        mutation: UPDATE_TENANT_SETTINGS_MUTATION,
        variables: {
          input: {
            defaultNightPrice,
            defaultTax,
            companyName: company.companyName.trim(),
            companyAddress: company.companyAddress.trim(),
            companyPhone: company.companyPhone.trim(),
            companyEmail: company.companyEmail.trim(),
            companyTaxId: company.companyTaxId.trim(),
            companyLogoUrl: company.companyLogoUrl.trim(),
            invoiceFooter: company.invoiceFooter.trim(),
          },
        },
      });

      const updatedTenant: Tenant = {
        ...updated,
        defaultNightPrice,
        defaultTax,
        companyName: company.companyName.trim() || null,
        companyAddress: company.companyAddress.trim() || null,
        companyPhone: company.companyPhone.trim() || null,
        companyEmail: company.companyEmail.trim() || null,
        companyTaxId: company.companyTaxId.trim() || null,
        companyLogoUrl: company.companyLogoUrl.trim() || null,
        invoiceFooter: company.invoiceFooter.trim() || null,
      };
      setTenant(updatedTenant);
      onSessionChange({ ...session, tenant: updatedTenant });
    } finally {
      setSaving(false);
    }
  };

  // ---- Plan + subscription summary ----------------------------------------
  // Pulled from PLANS constants + tenant.{plan, validUntil, subscriptionStatus}.
  // Shown at the very top of Settings so users can see what they're paying for
  // and when it expires without searching for it elsewhere.
  const planKey: PlanKey = ((session.tenant.plan as PlanKey) || 'trial');
  const planConfig = PLANS[planKey] || PLANS.trial;
  const usedRooms = (session.tenant.rooms || []).length;
  const planRoomsLabel = isUnlimited(planConfig.maxRooms) ? '∞' : String(planConfig.maxRooms);
  const validUntil = session.tenant.validUntil;
  const daysUntilExpiry = validUntil
    ? Math.ceil((new Date(validUntil).getTime() - Date.now()) / 86400000)
    : null;
  const subStatus = session.tenant.subscriptionStatus;
  const subDot =
    daysUntilExpiry !== null && daysUntilExpiry < 0 ? 'bg-red-500'
    : daysUntilExpiry !== null && daysUntilExpiry <= 7 ? 'bg-amber-500'
    : subStatus === 'ACTIVE' ? 'bg-emerald-500'
    : subStatus === 'TRIAL' ? 'bg-blue-500'
    : 'bg-slate-400';

  const planFeatures: string[] = [
    `${t(lang, 'plan.upTo')} ${planRoomsLabel} ${t(lang, 'plan.rooms')}`,
    planConfig.integrationsEnabled
      ? t(lang, 'plan.integrationsIncluded')
      : t(lang, 'plan.integrationsNotIncluded'),
    t(lang, 'plan.unlimitedBookings'),
    t(lang, 'plan.fullReports'),
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Plan card — what they're on, what's included, when it expires */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Crown size={24} weight="duotone" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t(lang, 'plan.currentPlan')}</p>
              <h2 className="text-2xl font-black text-slate-900 capitalize">
                {t(lang, `plan.${planKey}`)}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl">
            <span className={cn('w-2 h-2 rounded-full', subDot)} />
            <div className="text-end">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-tight">
                {t(lang, `status.${(subStatus || '').toLowerCase()}`)}
              </p>
              {validUntil && (
                <p className="text-xs font-black text-slate-700 leading-tight mt-0.5 flex items-center gap-1">
                  <Calendar size={11} weight="bold" className="text-slate-400" />
                  {formatTz(validUntil, 'yyyy-MM-dd', tenant.timezone || 'Asia/Muscat', lang)}
                  {daysUntilExpiry !== null && daysUntilExpiry >= 0 && (
                    <span className="text-slate-400 font-semibold">
                      ({daysUntilExpiry} {t(lang, 'plan.daysLeft')})
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {planFeatures.map((line, i) => (
            <div key={i} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check size={12} weight="bold" />
              </div>
              <span>{line}</span>
            </div>
          ))}
        </div>
        {/* Quota indicator */}
        <div className="mt-5 pt-5 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t(lang, 'plan.roomsUsed')}</p>
            <p className="text-lg font-black text-slate-800 tabular-nums">{usedRooms} / {planRoomsLabel}</p>
          </div>
          {planKey !== 'enterprise' && (
            <a
              href="https://wa.me/905523205496?text=I%27d%20like%20to%20upgrade%20my%20Hujuzatk%20plan"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-2xl transition-colors"
            >
              {t(lang, 'plan.upgrade')}
            </a>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-5">
        <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
          <Globe size={28} className="text-emerald-500" />
          {t(lang, 'settings.title')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block px-2">
              {t(lang, 'settings.language')}
            </label>
            <select
              value={tenant.language}
              onChange={(e) => setTenant({ ...tenant, language: e.target.value })}
              className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-2 font-black focus:ring-2 focus:ring-emerald-500 transition-all"
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
              <option value="tr">Türkçe</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block px-2">
              {t(lang, 'settings.currency')}
            </label>
            <input
              value={tenant.currency}
              onChange={(e) => setTenant({ ...tenant, currency: e.target.value })}
              className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-3 font-black focus:ring-2 focus:ring-emerald-500 transition-all"
              placeholder="e.g. OMR"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block px-2">
              {t(lang, 'settings.timezone')}
            </label>
            <select
              value={tenant.timezone}
              onChange={(e) => setTenant({ ...tenant, timezone: e.target.value })}
              className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-2 font-black focus:ring-2 focus:ring-emerald-500 transition-all"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-5">
        <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
          <CurrencyDollar size={28} className="text-amber-500" />
          {t(lang, 'settings.defaults')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block px-2">
              {t(lang, 'settings.defaultNightPrice')}
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={defaultNightPrice}
              onChange={(e) => setDefaultNightPrice(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-3 font-black focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block px-2">
              {t(lang, 'settings.defaultTax')}
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={defaultTax}
              onChange={(e) => setDefaultTax(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-3 font-black focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Company profile — printed onto invoices */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-5">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <Buildings size={28} className="text-rose-400" />
            {t(lang, 'settings.company')}
          </h2>
          <p className="text-xs text-slate-400 mt-2">{t(lang, 'settings.companyHint')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            ['companyName', 'settings.companyName', 'text'],
            ['companyTaxId', 'settings.companyTaxId', 'text'],
            ['companyPhone', 'settings.companyPhone', 'tel'],
            ['companyEmail', 'settings.companyEmail', 'email'],
            ['companyLogoUrl', 'settings.companyLogoUrl', 'url'],
          ].map(([key, label, type]) => (
            <div key={key}>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 block px-2">{t(lang, label)}</label>
              <input
                type={type}
                value={(company as any)[key]}
                onChange={(e) => setCompany((c) => ({ ...c, [key]: e.target.value }))}
                className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
          ))}
          <div className="md:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 block px-2">{t(lang, 'settings.companyAddress')}</label>
            <textarea
              value={company.companyAddress}
              onChange={(e) => setCompany((c) => ({ ...c, companyAddress: e.target.value }))}
              rows={2}
              className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 block px-2">{t(lang, 'settings.invoiceFooter')}</label>
            <textarea
              value={company.invoiceFooter}
              onChange={(e) => setCompany((c) => ({ ...c, invoiceFooter: e.target.value }))}
              rows={2}
              placeholder={t(lang, 'settings.invoiceFooterPlaceholder')}
              className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-5">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-3">
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <Layout size={28} className="text-blue-500" />
            {t(lang, 'settings.rooms')}
            {/* Quota indicator: e.g. "5 / 10" or "3 / unlimited" */}
            {tenant.maxRooms && (
              <span className="text-xs font-mono font-black text-slate-400 tabular-nums">
                {(tenant.rooms || []).length} / {tenant.maxRooms >= 999 ? '∞' : tenant.maxRooms}
              </span>
            )}
          </h2>
          {(() => {
            const atCap = !!tenant.maxRooms && tenant.maxRooms < 999 && (tenant.rooms || []).length >= tenant.maxRooms;
            return (
              <div className="flex items-center gap-3">
                {atCap && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl">
                    {t(lang, 'settings.upgradeForMoreRooms')}
                  </span>
                )}
                <button
                  onClick={handleAddRoom}
                  disabled={atCap}
                  className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t(lang, 'settings.addRoom')}
                </button>
              </div>
            );
          })()}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {(tenant.rooms || []).map((room, idx) => (
            <div key={room.id} className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest block px-2">{room.name}</label>
              <div className="flex gap-2">
                <input
                  value={room.name}
                  onChange={(e) => handleRoomChange(idx, e.target.value)}
                  className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-3 font-black focus:ring-2 focus:ring-emerald-500 transition-all"
                />
                <button
                  onClick={() => handleRemoveRoom(idx)}
                  className="text-slate-400 hover:text-red-500 transition-colors px-2"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="font-black text-slate-800 text-sm">{t(lang, 'import.title')}</div>
            <div className="text-xs text-slate-500 mt-0.5">{t(lang, 'import.settingsHint')}</div>
          </div>
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all shadow-xl shadow-slate-200 active:scale-95"
          >
            <Upload size={15} weight="bold" />
            {t(lang, 'list.import')}
          </button>
        </div>
      </div>

      {showImportModal && (
        <ImportBookingsModal
          onClose={() => setShowImportModal(false)}
          rooms={tenant.rooms || []}
          lang={lang}
        />
      )}

      <div className="flex justify-center pt-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 text-white px-20 py-5 rounded-2xl text-xl font-black shadow-2xl shadow-emerald-100 hover:bg-emerald-700 hover:shadow-emerald-200 transition-all active:scale-95 disabled:opacity-60"
        >
          {saving ? t(lang, 'settings.saving') : t(lang, 'settings.save')}
        </button>
      </div>
    </div>
  );
}
