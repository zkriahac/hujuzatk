import { useEffect, useMemo, useState } from 'react';
import { gql } from '@apollo/client';
import { apolloClient } from '../lib/apolloClient';
import { authService } from '../lib/authService';
import { t, type Language } from '../lib/i18n';
import { formatTz } from '../utils/formatTz';
import { cn } from '../utils/cn';
import { Users, X, MagnifyingGlass, Buildings, CheckCircle, Clock, WarningCircle, Prohibit } from 'phosphor-react';

type TenantStatusFilter = 'all' | 'active' | 'trial' | 'expired' | 'deactivated';

/** Bucket a tenant into exactly one status used by the stat cards + filters. */
function tenantBucket(tObj: Tenant): Exclude<TenantStatusFilter, 'all'> {
  if ((tObj as any).isActive === false) return 'deactivated';
  const s = (tObj.subscriptionStatus || '').toUpperCase();
  if (s === 'ACTIVE') return 'active';
  if (s === 'TRIAL') return 'trial';
  return 'expired';
}
import type { Tenant } from '../db';
import { ADMIN_SET_INTEGRATIONS_ENABLED_MUTATION, ADMIN_SET_PLAN_MUTATION } from '../lib/graphql';
import { PLAN_ORDER, type PlanKey } from '../lib/planConfig';

const ADMIN_UPDATE_TENANT = gql`
  mutation AdminUpdateTenant($tenantId: ID!, $input: UpdateTenantInput!) {
    adminUpdateTenant(tenantId: $tenantId, input: $input) {
      id name email phone language currency timezone rooms { id name } subscriptionStatus validUntil isAdmin integrationsEnabled onboardedAt plan maxRooms bookingsCount
    }
  }
`;

const ADMIN_LOGIN_AS = gql`
  mutation AdminLoginAs($tenantId: ID!) {
    adminLoginAs(tenantId: $tenantId) {
      token
      refreshToken
      tenant {
        id name email phone language currency timezone rooms { id name }
        subscriptionStatus validUntil isAdmin integrationsEnabled onboardedAt plan maxRooms createdAt
      }
    }
  }
`;

const GET_GLOBAL_SETTINGS = gql`
  query GetGlobalSettings {
    getGlobalSettings {
      defaultLanguage
      defaultCurrency
      defaultTimezone
      defaultRooms { id name }
      defaultTrialDays
    }
  }
`;

const UPDATE_GLOBAL_SETTINGS = gql`
  mutation UpdateGlobalSettings($input: UpdateGlobalSettingsInput!) {
    updateGlobalSettings(input: $input) {
      defaultLanguage
      defaultCurrency
      defaultTimezone
      defaultRooms { id name }
      defaultTrialDays
    }
  }
`;

const ADMIN_CREATE_SUBSCRIPTION = gql`
  mutation CreateAdminSubscription($tenantId: ID!, $days: Int!) {
    createAdminSubscription(tenantId: $tenantId, days: $days) {
      id subscriptionStatus validUntil
    }
  }
`;

const ADMIN_CANCEL_SUBSCRIPTION = gql`
  mutation CancelSubscription($tenantId: ID!) {
    cancelSubscription(tenantId: $tenantId)
  }
`;

const ADMIN_DEACTIVATE_TENANT = gql`
  mutation AdminDeactivateTenant($tenantId: ID!) {
    adminDeactivateTenant(tenantId: $tenantId)
  }
`;

const ADMIN_DELETE_TENANT = gql`
  mutation AdminDeleteTenant($tenantId: ID!) {
    adminDeleteTenant(tenantId: $tenantId)
  }
`;

const TIMEZONES = [
  'Asia/Muscat','Asia/Riyadh','Asia/Dubai','Asia/Kuwait','Asia/Qatar','Asia/Amman',
  'Africa/Cairo','Europe/Istanbul','Europe/London','America/New_York','UTC',
];

function DefaultsView({ lang }: { lang: Language }) {
  const [f, setF] = useState<any>({ language: 'en', currency: 'OMR', timezone: 'Asia/Muscat', rooms: [], trialDays: 14 });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apolloClient.query({ query: GET_GLOBAL_SETTINGS, fetchPolicy: 'network-only' })
      .then(({ data }) => {
        const s = (data as any).getGlobalSettings;
        setF({ language: s.defaultLanguage, currency: s.defaultCurrency, timezone: s.defaultTimezone, rooms: (s.defaultRooms || []).map((r: any) => ({ id: r.id, name: r.name })), trialDays: s.defaultTrialDays });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRoomChange = (i: number, name: string) => {
    const rooms = [...f.rooms]; rooms[i] = { ...rooms[i], name }; setF({ ...f, rooms });
  };
  const handleAddRoom = () => setF({ ...f, rooms: [...f.rooms, { id: `r${Date.now()}`, name: `Room ${f.rooms.length + 1}` }] });
  const handleRemoveRoom = (i: number) => setF({ ...f, rooms: f.rooms.filter((_: any, idx: number) => idx !== i) });
  const handleSave = async () => {
    try {
      await apolloClient.mutate({ mutation: UPDATE_GLOBAL_SETTINGS, variables: { input: { defaultLanguage: f.language, defaultCurrency: f.currency, defaultTimezone: f.timezone, defaultRooms: f.rooms.map((r: any) => ({ id: r.id, name: r.name })), defaultTrialDays: f.trialDays } } });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert('Failed to save: ' + (err.message || 'Unknown error'));
    }
  };

  if (loading) return <div className="text-center text-slate-500 py-20 font-black uppercase text-xs tracking-widest">Loading defaults...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
        <h2 className="text-xl font-black text-emerald-400 mb-1">New Tenant Defaults</h2>
        <p className="text-xs text-slate-500 mb-8">Applied automatically when a new workspace registers.</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-2">{t(lang, 'settings.language')}</label>
            <select value={f.language} onChange={e => setF({ ...f, language: e.target.value })}
              className="w-full bg-slate-800 text-white rounded-2xl px-4 py-3 font-black focus:ring-2 focus:ring-emerald-500 outline-none">
              <option value="en">English</option>
              <option value="ar">العربية</option>
              <option value="tr">Türkçe</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-2">{t(lang, 'settings.currency')}</label>
            <input value={f.currency} onChange={e => setF({ ...f, currency: e.target.value })}
              className="w-full bg-slate-800 text-white rounded-2xl px-4 py-3 font-black focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. OMR" />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-2">{t(lang, 'settings.timezone')}</label>
            <select value={f.timezone} onChange={e => setF({ ...f, timezone: e.target.value })}
              className="w-full bg-slate-800 text-white rounded-2xl px-4 py-3 font-black focus:ring-2 focus:ring-emerald-500 outline-none">
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-2">Trial Days</label>
            <input type="number" value={f.trialDays} onChange={e => setF({ ...f, trialDays: parseInt(e.target.value) || 14 })}
              className="w-full bg-slate-800 text-white rounded-2xl px-4 py-3 font-black focus:ring-2 focus:ring-emerald-500 outline-none" min={1} />
          </div>
        </div>
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t(lang, 'settings.rooms')}</label>
            <button onClick={handleAddRoom} className="px-4 py-1.5 bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-600 transition-all">+ Add</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {f.rooms.map((r: any, i: number) => (
              <div key={r.id} className="flex gap-2 items-center">
                <input value={r.name} onChange={e => handleRoomChange(i, e.target.value)}
                  className="flex-1 bg-slate-800 text-white rounded-xl px-3 py-2 text-sm font-black focus:ring-2 focus:ring-emerald-500 outline-none" />
                <button onClick={() => handleRemoveRoom(i)} className="text-slate-600 hover:text-red-400 transition-colors"><X size={14} weight="bold" /></button>
              </div>
            ))}
            {f.rooms.length === 0 && <p className="col-span-4 text-[10px] text-slate-600 font-black uppercase tracking-widest py-2">No default rooms — tenants start empty</p>}
          </div>
        </div>
        <button onClick={handleSave} className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-emerald-500 transition-all active:scale-95">
          {saved ? '✓ Saved' : t(lang, 'settings.save')}
        </button>
      </div>
    </div>
  );
}

function AdminTenantRow({ tObj, onReload, lang, tz }: { tObj: Tenant; onReload: () => void; lang: Language; tz: string }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [f, setF] = useState({
    name: tObj.name || '',
    language: tObj.language || 'en',
    currency: tObj.currency || 'USD',
    timezone: tObj.timezone || 'UTC',
    rooms: (tObj.rooms || []).map((r: any) => ({ id: r.id, name: r.name })),
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await apolloClient.mutate({ mutation: ADMIN_UPDATE_TENANT, variables: { tenantId: tObj.uuid || (tObj as any).id, input: f } });
      setEditing(false);
      onReload();
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    try {
      await apolloClient.mutate({ mutation: ADMIN_CREATE_SUBSCRIPTION, variables: { tenantId: tObj.uuid || (tObj as any).id, days: 30 } });
      onReload();
    } catch (err: any) {
      alert('Activate failed: ' + (err.message || 'Unknown error'));
    }
  };

  const handleLoginAs = async () => {
    try {
      const { data } = await apolloClient.mutate({ mutation: ADMIN_LOGIN_AS, variables: { tenantId: tObj.uuid || (tObj as any).id } });
      const { token, refreshToken } = (data as any).adminLoginAs;
      // Store admin token to restore later
      const adminToken = localStorage.getItem('authToken');
      const adminRefresh = localStorage.getItem('refreshToken');
      localStorage.setItem('adminToken_backup', adminToken || '');
      localStorage.setItem('adminRefresh_backup', adminRefresh || '');
      // Switch to customer token
      localStorage.setItem('authToken', token);
      localStorage.setItem('refreshToken', refreshToken);
      // Navigate to their workspace
      const slug = encodeURIComponent((tObj.name || 'workspace').replace(/\s+/g, '-'));
      window.location.href = `/${slug}`;
    } catch (err: any) {
      alert('Login as failed: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDeactivate = async () => {
    const isActive = (tObj as any).isActive !== false;
    if (isActive && !confirm(`Deactivate "${tObj.name}"? They will not be able to log in.`)) return;
    try {
      await apolloClient.mutate({ mutation: ADMIN_DEACTIVATE_TENANT, variables: { tenantId: tObj.uuid || (tObj as any).id } });
      onReload();
    } catch (err: any) {
      alert('Failed: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDelete = async () => {
    if (!confirm(`DELETE "${tObj.name}" and ALL their data? This cannot be undone!`)) return;
    if (!confirm(`Are you absolutely sure? This will permanently delete the account, all bookings, payments, and audit logs.`)) return;
    try {
      await apolloClient.mutate({ mutation: ADMIN_DELETE_TENANT, variables: { tenantId: tObj.uuid || (tObj as any).id } });
      onReload();
    } catch (err: any) {
      alert('Failed: ' + (err.message || 'Unknown error'));
    }
  };

  const handleToggleIntegrations = async () => {
    const current = (tObj as any).integrationsEnabled !== false;
    try {
      await apolloClient.mutate({
        mutation: ADMIN_SET_INTEGRATIONS_ENABLED_MUTATION,
        variables: { tenantId: tObj.uuid || (tObj as any).id, enabled: !current },
      });
      onReload();
    } catch (err: any) {
      alert('Failed to toggle integrations: ' + (err.message || 'Unknown error'));
    }
  };

  const handleSetPlan = async (plan: PlanKey) => {
    try {
      await apolloClient.mutate({
        mutation: ADMIN_SET_PLAN_MUTATION,
        variables: { tenantId: tObj.uuid || (tObj as any).id, plan },
      });
      onReload();
    } catch (err: any) {
      alert('Failed to change plan: ' + (err.message || 'Unknown error'));
    }
  };

  const handleRoomChange = (i: number, name: string) => {
    const rooms = [...f.rooms]; rooms[i] = { ...rooms[i], name }; setF({ ...f, rooms });
  };
  const handleAddRoom = () => setF({ ...f, rooms: [...f.rooms, { id: `R${Date.now()}`, name: `Room ${f.rooms.length + 1}` }] });
  const handleRemoveRoom = (i: number) => setF({ ...f, rooms: f.rooms.filter((_: any, idx: number) => idx !== i) });

  const isActive = (tObj as any).isActive !== false;
  const tRooms = tObj.rooms || [];

  return (
    <>
      <tr className="hover:bg-slate-800/50 transition-colors group cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <td className="px-6 py-4">
          <div className={cn('font-black', isActive ? 'text-white' : 'text-slate-500 line-through')}>{tObj.name}</div>
          <div className="text-[10px] text-slate-500 font-bold">
            {!isActive && <span className="text-red-400 mr-1">DEACTIVATED</span>}
            {(tObj as any).phone || '—'}
          </div>
        </td>
        <td className="px-6 py-4 text-xs font-bold text-slate-400">{tObj.email}</td>
        <td className="px-6 py-4">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
            {tObj.language?.toUpperCase()} · {tObj.currency} · {tObj.timezone}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {tRooms.slice(0, 6).map((r: any) => (
              <span key={r.id} className="px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded text-[9px] font-black">{r.name}</span>
            ))}
            {tRooms.length > 6 && <span className="px-1.5 py-0.5 text-slate-500 text-[9px] font-black">+{tRooms.length - 6}</span>}
            {tRooms.length === 0 && <span className="text-[9px] text-slate-600 font-black">No rooms</span>}
          </div>
        </td>
        <td className="px-6 py-4">
          <span className={cn('px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest',
            tObj.subscriptionStatus === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' :
            tObj.subscriptionStatus === 'TRIAL'  ? 'bg-blue-500/10 text-blue-400' :
            'bg-red-500/10 text-red-400'
          )}>
            {t(lang, `status.${(tObj.subscriptionStatus || '').toLowerCase()}`)}
          </span>
          <div className="text-[10px] text-slate-500 font-bold mt-1">
            {(tObj as any).bookingsCount ?? 0} bookings
          </div>
        </td>
        <td className="px-6 py-4 text-xs font-black text-slate-400">
          {tObj.validUntil ? formatTz(tObj.validUntil, 'yyyy-MM-dd', tz, lang) : '—'}
        </td>
        <td className="px-6 py-4 text-end whitespace-nowrap" onClick={e => e.stopPropagation()}>
          <div className="flex gap-2 justify-end">
            <button onClick={handleLoginAs}
              className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-purple-500"
              title="Login as this customer">
              Login As
            </button>
            <button onClick={() => setEditing(e => !e)}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-blue-500">
              {editing ? 'Close' : 'Edit'}
            </button>
            {!(tObj as any).isAdmin && (
              <select
                value={(tObj as any).plan || 'trial'}
                onChange={(e) => handleSetPlan(e.target.value as PlanKey)}
                title="Change plan"
                className="px-2 py-1.5 bg-violet-600 text-white rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-violet-500 border-0 cursor-pointer"
              >
                {PLAN_ORDER.map((p) => <option key={p} value={p}>{p.toUpperCase()}</option>)}
              </select>
            )}
            {!(tObj as any).isAdmin && (
              <button
                onClick={handleToggleIntegrations}
                title={t(lang, 'admin.integrations_tip')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter text-white',
                  (tObj as any).integrationsEnabled !== false ? 'bg-sky-600 hover:bg-sky-500' : 'bg-slate-500 hover:bg-slate-400'
                )}
              >
                {(tObj as any).integrationsEnabled !== false
                  ? t(lang, 'admin.integrations_on')
                  : t(lang, 'admin.integrations_off')}
              </button>
            )}
            {tObj.subscriptionStatus !== 'ACTIVE' && (
              <button onClick={handleActivate}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-emerald-500">
                {t(lang, 'admin.activate')}
              </button>
            )}
            {!(tObj as any).isAdmin && (
              <button onClick={handleDeactivate}
                className={cn('px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter',
                  isActive ? 'bg-orange-600 text-white hover:bg-orange-500' : 'bg-green-600 text-white hover:bg-green-500')}>
                {isActive ? 'Deactivate' : 'Activate'}
              </button>
            )}
            {!(tObj as any).isAdmin && (
              <button onClick={handleDelete}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-red-500">
                Delete
              </button>
            )}
          </div>
        </td>
      </tr>
      {/* Expanded detail row */}
      {expanded && !editing && (
        <tr className="bg-slate-800/40">
          <td colSpan={6} className="px-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Phone</span>
                <span className="text-slate-300 font-bold">{(tObj as any).phone || 'Not set'}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Night Price</span>
                <span className="text-slate-300 font-bold">{tObj.defaultNightPrice ?? 50} {tObj.currency}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Tax</span>
                <span className="text-slate-300 font-bold">{tObj.defaultTax ?? 0}%</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Created</span>
                <span className="text-slate-300 font-bold">{tObj.createdAt ? formatTz(tObj.createdAt, 'yyyy-MM-dd', tz, lang) : '—'}</span>
              </div>
            </div>
            <div className="mt-3">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Rooms ({tRooms.length})</span>
              <div className="flex flex-wrap gap-1.5">
                {tRooms.map((r: any) => (
                  <span key={r.id} className="px-2 py-1 bg-slate-700 text-slate-200 rounded-lg text-[10px] font-black">
                    {r.id}: {r.name}
                  </span>
                ))}
                {tRooms.length === 0 && <span className="text-[10px] text-slate-600 font-black">No rooms configured</span>}
              </div>
            </div>
          </td>
        </tr>
      )}
      {editing && (
        <tr className="bg-slate-800/60">
          <td colSpan={6} className="px-6 py-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">Name</label>
                <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })}
                  className="w-full bg-slate-700 text-white rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">{t(lang, 'settings.language')}</label>
                <select value={f.language} onChange={e => setF({ ...f, language: e.target.value })}
                  className="w-full bg-slate-700 text-white rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none">
                  <option value="en">English</option>
                  <option value="ar">العربية</option>
                  <option value="tr">Türkçe</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">{t(lang, 'settings.currency')}</label>
                <input value={f.currency} onChange={e => setF({ ...f, currency: e.target.value })}
                  className="w-full bg-slate-700 text-white rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">{t(lang, 'settings.timezone')}</label>
                <select value={f.timezone} onChange={e => setF({ ...f, timezone: e.target.value })}
                  className="w-full bg-slate-700 text-white rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none">
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t(lang, 'settings.rooms')}</label>
                <button onClick={handleAddRoom} className="px-3 py-1 bg-slate-600 text-white rounded-lg text-[9px] font-black uppercase hover:bg-slate-500">+ Add</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {f.rooms.map((r: any, i: number) => (
                  <div key={r.id} className="flex gap-1.5 items-center">
                    <span className="text-[9px] font-black text-slate-600 uppercase w-6 shrink-0">{r.id}</span>
                    <input value={r.name} onChange={e => handleRoomChange(i, e.target.value)}
                      className="flex-1 bg-slate-700 text-white rounded-lg px-2 py-1.5 text-xs font-black focus:ring-1 focus:ring-emerald-500 outline-none" />
                    <button onClick={() => handleRemoveRoom(i)} className="text-slate-600 hover:text-red-400 transition-colors"><X size={12} weight="bold" /></button>
                  </div>
                ))}
                {f.rooms.length === 0 && <p className="col-span-4 text-[9px] text-slate-600 font-black uppercase tracking-widest py-1">No rooms</p>}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 disabled:opacity-50 transition-all">
                {saving ? 'Saving…' : t(lang, 'settings.save')}
              </button>
              <button onClick={() => setEditing(false)}
                className="px-6 py-2 bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-600 transition-all">
                {t(lang, 'booking.cancel')}
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

interface AdminViewProps {
  lang: Language;
  tz: string;
  superadmin?: boolean;
}

export default function AdminView({ lang, tz }: AdminViewProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'tenants' | 'defaults'>('tenants');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TenantStatusFilter>('all');

  const loadTenants = async () => {
    setLoading(true);
    try {
      const list = await authService.adminListTenants();
      setTenants(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadTenants(); }, []);

  // Summary counts for the stat cards.
  const stats = useMemo(() => {
    const s = { total: tenants.length, active: 0, trial: 0, expired: 0, deactivated: 0 };
    for (const tObj of tenants) s[tenantBucket(tObj)]++;
    return s;
  }, [tenants]);

  // Search (name / email / phone) + status filter.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tenants.filter((tObj) => {
      if (statusFilter !== 'all' && tenantBucket(tObj) !== statusFilter) return false;
      if (!q) return true;
      return (
        (tObj.name || '').toLowerCase().includes(q) ||
        (tObj.email || '').toLowerCase().includes(q) ||
        String((tObj as any).phone || '').toLowerCase().includes(q)
      );
    });
  }, [tenants, search, statusFilter]);

  const STAT_CARDS = [
    { key: 'all'        as TenantStatusFilter, label: t(lang, 'admin.statTotal'),       value: stats.total,       Icon: Buildings,     tone: 'text-slate-200',   ring: 'ring-slate-600' },
    { key: 'active'     as TenantStatusFilter, label: t(lang, 'admin.statActive'),      value: stats.active,      Icon: CheckCircle,   tone: 'text-emerald-400', ring: 'ring-emerald-500' },
    { key: 'trial'      as TenantStatusFilter, label: t(lang, 'admin.statTrial'),       value: stats.trial,       Icon: Clock,         tone: 'text-blue-400',    ring: 'ring-blue-500' },
    { key: 'expired'    as TenantStatusFilter, label: t(lang, 'admin.statExpired'),     value: stats.expired,     Icon: WarningCircle, tone: 'text-amber-400',   ring: 'ring-amber-500' },
    { key: 'deactivated' as TenantStatusFilter, label: t(lang, 'admin.statDeactivated'), value: stats.deactivated, Icon: Prohibit,      tone: 'text-red-400',     ring: 'ring-red-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 px-4">
        <div className="flex gap-1 bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setTab('tenants')}
            className={cn('px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
              tab === 'tenants' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200')}
          >
            Tenants
          </button>
          <button
            onClick={() => setTab('defaults')}
            className={cn('px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
              tab === 'defaults' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200')}
          >
            Defaults
          </button>
        </div>
      </div>

      {tab === 'defaults' ? (
        <DefaultsView lang={lang} />
      ) : (
        <>
          <div className="flex flex-wrap justify-between items-center gap-3 px-4">
            <h2 className="text-2xl font-black text-emerald-400 flex items-center gap-3">
              <Users size={32} className="text-emerald-400" />
              {t(lang, 'admin.title')}
            </h2>
            <button onClick={loadTenants}
              className="bg-emerald-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all">
              {t(lang, 'admin.refresh')}
            </button>
          </div>

          {/* Summary stat cards — click one to filter the table by that status. */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 px-4">
            {STAT_CARDS.map(({ key, label, value, Icon, tone, ring }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={cn(
                  'flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-start transition-all hover:border-slate-600',
                  statusFilter === key && `ring-2 ${ring} border-transparent`,
                )}
              >
                <Icon size={26} weight="duotone" className={tone} />
                <div className="min-w-0">
                  <div className={cn('text-2xl font-black leading-none', tone)}>{value}</div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1 truncate">{label}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="px-4">
            <div className="relative max-w-md">
              <MagnifyingGlass size={16} weight="bold" className="absolute top-1/2 -translate-y-1/2 start-4 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t(lang, 'admin.searchPlaceholder')}
                className="w-full bg-slate-900 border border-slate-800 rounded-full ps-11 pe-4 py-2.5 text-sm font-bold text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="overflow-auto max-h-[70vh] scrollbar-hide">
              <table className="w-full text-sm">
                <thead className="bg-slate-950/80 sticky top-0 z-10">
                  <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    <th className="px-6 py-5 text-start">{t(lang, 'admin.name')}</th>
                    <th className="px-6 py-5 text-start">{t(lang, 'admin.email')}</th>
                    <th className="px-6 py-5 text-start">{t(lang, 'admin.config')}</th>
                    <th className="px-6 py-5 text-start">{t(lang, 'admin.subscription')}</th>
                    <th className="px-6 py-5 text-start">{t(lang, 'admin.validUntil')}</th>
                    <th className="px-6 py-5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {loading ? (
                    <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-500 font-black uppercase text-xs tracking-widest">{t(lang, 'admin.loading')}</td></tr>
                  ) : tenants.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-500 font-black uppercase text-xs tracking-widest">{t(lang, 'admin.noTenants')}</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-500 font-black uppercase text-xs tracking-widest">{t(lang, 'admin.noMatches')}</td></tr>
                  ) : filtered.map((tObj) => (
                    <AdminTenantRow key={tObj.uuid || (tObj as any).id} tObj={tObj} onReload={loadTenants} lang={lang} tz={tz} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
