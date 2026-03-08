import { useEffect, useState } from 'react';
import { gql } from '@apollo/client';
import { apolloClient } from '../lib/apolloClient';
import { authService } from '../lib/authService';
import { t, type Language } from '../lib/i18n';
import { formatTz } from '../utils/formatTz';
import { cn } from '../utils/cn';
import { Users, X } from 'phosphor-react';
import type { Tenant } from '../db';

const ADMIN_UPDATE_TENANT = gql`
  mutation AdminUpdateTenant($tenantId: ID!, $input: UpdateTenantInput!) {
    adminUpdateTenant(tenantId: $tenantId, input: $input) {
      id name email language currency timezone subscriptionStatus validUntil isAdmin
    }
  }
`;

const TIMEZONES = [
  'Asia/Muscat','Asia/Riyadh','Asia/Dubai','Asia/Kuwait','Asia/Qatar','Asia/Amman',
  'Africa/Cairo','Europe/Istanbul','Europe/London','America/New_York','UTC',
];
const ADMIN_DEFAULTS_KEY = 'admin-defaults';

function DefaultsView({ lang }: { lang: Language }) {
  const getDefaults = () => {
    try { return JSON.parse(localStorage.getItem(ADMIN_DEFAULTS_KEY) || '{}'); } catch { return {}; }
  };
  const [f, setF] = useState<any>(() => ({ language: 'en', currency: 'USD', timezone: 'UTC', rooms: [], ...getDefaults() }));
  const [saved, setSaved] = useState(false);

  const handleRoomChange = (i: number, name: string) => {
    const rooms = [...f.rooms]; rooms[i] = { ...rooms[i], name }; setF({ ...f, rooms });
  };
  const handleAddRoom = () => setF({ ...f, rooms: [...f.rooms, { id: `R${Date.now()}`, name: `Room ${f.rooms.length + 1}` }] });
  const handleRemoveRoom = (i: number) => setF({ ...f, rooms: f.rooms.filter((_: any, idx: number) => idx !== i) });
  const handleSave = () => {
    localStorage.setItem(ADMIN_DEFAULTS_KEY, JSON.stringify(f));
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-10">
        <h2 className="text-xl font-black text-emerald-400 mb-1">New Tenant Defaults</h2>
        <p className="text-xs text-slate-500 mb-8">Applied automatically when a new workspace registers.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-2">{t(lang, 'settings.language')}</label>
            <select value={f.language} onChange={e => setF({ ...f, language: e.target.value })}
              className="w-full bg-slate-800 text-white rounded-2xl px-4 py-3 font-black focus:ring-2 focus:ring-emerald-500 outline-none">
              <option value="en">English</option>
              <option value="ar">العربية</option>
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
      await apolloClient.mutate({ mutation: ADMIN_UPDATE_TENANT, variables: { tenantId: tObj.id, input: f } });
      setEditing(false);
      onReload();
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    await authService.adminSetSubscriptionStatus(tObj.uuid, 'ACTIVE', tObj.validUntil || new Date().toISOString().slice(0, 10));
    onReload();
  };

  const handleRoomChange = (i: number, name: string) => {
    const rooms = [...f.rooms]; rooms[i] = { ...rooms[i], name }; setF({ ...f, rooms });
  };
  const handleAddRoom = () => setF({ ...f, rooms: [...f.rooms, { id: `R${Date.now()}`, name: `Room ${f.rooms.length + 1}` }] });
  const handleRemoveRoom = (i: number) => setF({ ...f, rooms: f.rooms.filter((_: any, idx: number) => idx !== i) });

  return (
    <>
      <tr className="hover:bg-slate-800/50 transition-colors group">
        <td className="px-6 py-4 font-black text-white">{tObj.name}</td>
        <td className="px-6 py-4 text-xs font-bold text-slate-400">{tObj.email}</td>
        <td className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-tighter">
          {tObj.language?.toUpperCase()} · {tObj.currency} · {tObj.timezone}
          {tObj.rooms?.length ? ` · ${tObj.rooms.length} rooms` : ''}
        </td>
        <td className="px-6 py-4">
          <span className={cn('px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest',
            tObj.subscriptionStatus === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' :
            tObj.subscriptionStatus === 'TRIAL'  ? 'bg-blue-500/10 text-blue-400' :
            'bg-red-500/10 text-red-400'
          )}>
            {t(lang, `status.${tObj.subscriptionStatus}`)}
          </span>
        </td>
        <td className="px-6 py-4 text-xs font-black text-slate-400">
          {tObj.validUntil ? formatTz(tObj.validUntil, 'yyyy-MM-dd', tz, lang) : '—'}
        </td>
        <td className="px-6 py-4 text-right whitespace-nowrap">
          <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setEditing(e => !e)}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-blue-500">
              {editing ? 'Close' : 'Edit'}
            </button>
            {tObj.subscriptionStatus !== 'ACTIVE' && (
              <button onClick={handleActivate}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-emerald-500">
                {t(lang, 'admin.activate')}
              </button>
            )}
          </div>
        </td>
      </tr>
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
          <div className="flex justify-between items-center px-4">
            <h2 className="text-2xl font-black text-emerald-400 flex items-center gap-3">
              <Users size={32} className="text-emerald-400" />
              {t(lang, 'admin.title')}
            </h2>
            <button onClick={loadTenants}
              className="bg-emerald-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all">
              {t(lang, 'admin.refresh')}
            </button>
          </div>
          <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl">
            <div className="overflow-auto max-h-[75vh] scrollbar-hide">
              <table className="w-full text-sm">
                <thead className="bg-slate-950/80 sticky top-0 z-10">
                  <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    <th className="px-6 py-5 text-left">{t(lang, 'admin.name')}</th>
                    <th className="px-6 py-5 text-left">{t(lang, 'admin.email')}</th>
                    <th className="px-6 py-5 text-left">{t(lang, 'admin.config')}</th>
                    <th className="px-6 py-5 text-left">{t(lang, 'admin.subscription')}</th>
                    <th className="px-6 py-5 text-left">{t(lang, 'admin.validUntil')}</th>
                    <th className="px-6 py-5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {loading ? (
                    <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-500 font-black uppercase text-xs tracking-widest">{t(lang, 'admin.loading')}</td></tr>
                  ) : tenants.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-500 font-black uppercase text-xs tracking-widest">{t(lang, 'admin.noTenants')}</td></tr>
                  ) : tenants.map((tObj) => (
                    <AdminTenantRow key={tObj.uuid} tObj={tObj} onReload={loadTenants} lang={lang} tz={tz} />
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
