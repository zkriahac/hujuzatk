import { useState } from 'react';
import { Globe, Layout } from 'phosphor-react';
import { authService } from '../lib/authService';
import type { SessionUser } from '../lib/authService';
import { t, type Language } from '../lib/i18n';
import type { Tenant } from '../db';

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

  const handleRoomChange = (index: number, value: string) => {
    const rooms = [...(tenant.rooms || [])];
    rooms[index] = { ...rooms[index], name: value };
    setTenant({ ...tenant, rooms });
  };

  const handleAddRoom = () => {
    const rooms = [...(tenant.rooms || [])];
    const id = `R${rooms.length + 1}`;
    rooms.push({ id, name: id });
    setTenant({ ...tenant, rooms });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await authService.updateTenantConfig(tenant.uuid, {
        language: tenant.language,
        currency: tenant.currency,
        timezone: tenant.timezone,
        rooms: tenant.rooms,
      });
      setTenant(updated);
      onSessionChange({ ...session, tenant: updated });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl p-10">
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

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl p-10">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <Layout size={28} className="text-blue-500" />
            {t(lang, 'settings.rooms')}
          </h2>
          <button
            onClick={handleAddRoom}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
          >
            {t(lang, 'settings.addRoom')}
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {(tenant.rooms || []).map((room, idx) => (
            <div key={room.id} className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 block px-2">{room.id}</label>
              <input
                value={room.name}
                onChange={(e) => handleRoomChange(idx, e.target.value)}
                className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-3 font-black focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center pt-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 text-white px-20 py-5 rounded-[2rem] text-xl font-black shadow-2xl shadow-emerald-100 hover:bg-emerald-700 hover:shadow-emerald-200 transition-all active:scale-95 disabled:opacity-60"
        >
          {saving ? t(lang, 'settings.saving') : t(lang, 'settings.save')}
        </button>
      </div>
    </div>
  );
}
