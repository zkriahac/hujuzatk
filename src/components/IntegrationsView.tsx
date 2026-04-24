import { useEffect, useState } from 'react';
import { ArrowsClockwise, Trash, Plus, WarningCircle, CheckCircle, Link } from 'phosphor-react';
import { apolloClient } from '../lib/apolloClient';
import { t, type Language } from '../lib/i18n';
import type { SessionUser } from '../lib/authService';
import {
  GET_CHANNEL_INTEGRATIONS_QUERY,
  SAVE_CHANNEL_INTEGRATION_MUTATION,
  DELETE_CHANNEL_INTEGRATION_MUTATION,
  SYNC_CHANNEL_MUTATION,
  SYNC_ALL_CHANNELS_MUTATION,
} from '../lib/graphql';

interface IntegrationsViewProps {
  session: SessionUser;
  lang: Language;
}

const CHANNEL_CONFIG: Record<string, { label: string; color: string; hint: string }> = {
  airbnb: {
    label: 'Airbnb',
    color: '#FF5A5F',
    hint: 'Airbnb → Manage listings → Calendar → Export calendar → Copy URL',
  },
  gathern: {
    label: 'جاذبين (Gathern)',
    color: '#00C896',
    hint: 'في تطبيق جاذبين: الإعدادات ← مزامنة التقويم ← نسخ الرابط',
  },
  'booking.com': {
    label: 'Booking.com',
    color: '#003580',
    hint: 'Extranet → Calendar → Sync calendars → Export calendar → Copy iCal URL',
  },
};

interface ChannelIntegration {
  id: string;
  channelName: string;
  roomId: string;
  icalUrlMasked: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  lastSyncStatus: string | null;
  lastSyncMessage: string | null;
  lastSyncCount: number | null;
}

interface AddFormState {
  channelName: string;
  roomId: string;
  icalUrl: string;
}

export default function IntegrationsView({ session, lang }: IntegrationsViewProps) {
  const rooms: { id: string; name: string }[] = session.tenant.rooms || [];
  const isRtl = lang === 'ar';

  const [integrations, setIntegrations] = useState<ChannelIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<AddFormState>({
    channelName: 'airbnb',
    roomId: rooms[0]?.id || '',
    icalUrl: '',
  });
  const [saving, setSaving] = useState(false);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [syncingAll, setSyncingAll] = useState(false);
  const [formError, setFormError] = useState('');
  const [syncMessages, setSyncMessages] = useState<Record<string, { success: boolean; message: string }>>({});

  const loadIntegrations = async () => {
    try {
      const { data } = await apolloClient.query({
        query: GET_CHANNEL_INTEGRATIONS_QUERY,
        fetchPolicy: 'network-only',
      });
      setIntegrations((data as any)?.getChannelIntegrations || []);
    } catch {
      // silently ignore — auth errors are handled by apolloClient error link
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadIntegrations(); }, []);

  const handleAdd = async () => {
    setFormError('');
    if (!form.icalUrl.trim().startsWith('http')) {
      setFormError('Please enter a valid iCal URL starting with http');
      return;
    }
    if (!form.roomId) {
      setFormError('Please select a room');
      return;
    }
    setSaving(true);
    try {
      await apolloClient.mutate({
        mutation: SAVE_CHANNEL_INTEGRATION_MUTATION,
        variables: { input: { channelName: form.channelName, roomId: form.roomId, icalUrl: form.icalUrl.trim() } },
      });
      setShowAddForm(false);
      setForm({ channelName: 'airbnb', roomId: rooms[0]?.id || '', icalUrl: '' });
      await loadIntegrations();
    } catch (err: any) {
      setFormError(err.graphQLErrors?.[0]?.message || err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this channel integration?')) return;
    try {
      await apolloClient.mutate({ mutation: DELETE_CHANNEL_INTEGRATION_MUTATION, variables: { id } });
      await loadIntegrations();
    } catch (err: any) {
      alert(err.graphQLErrors?.[0]?.message || err.message || 'Delete failed');
    }
  };

  const handleSync = async (id: string) => {
    setSyncingIds(prev => new Set(prev).add(id));
    setSyncMessages(prev => { const n = { ...prev }; delete n[id]; return n; });
    try {
      const { data } = await apolloClient.mutate({ mutation: SYNC_CHANNEL_MUTATION, variables: { id } });
      const result = (data as any)?.syncChannel;
      if (result) {
        setSyncMessages(prev => ({ ...prev, [id]: { success: result.success, message: result.message } }));
        await loadIntegrations();
      }
    } catch (err: any) {
      setSyncMessages(prev => ({
        ...prev,
        [id]: { success: false, message: err.graphQLErrors?.[0]?.message || err.message || 'Sync failed' },
      }));
    } finally {
      setSyncingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      await apolloClient.mutate({ mutation: SYNC_ALL_CHANNELS_MUTATION });
      await loadIntegrations();
    } catch (err: any) {
      alert(err.graphQLErrors?.[0]?.message || err.message || 'Sync failed');
    } finally {
      setSyncingAll(false);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return t(lang, 'integrations.neverSynced');
    return new Date(iso).toLocaleString(
      lang === 'ar' ? 'ar-SA' : lang === 'tr' ? 'tr-TR' : 'en-US',
      { dateStyle: 'short', timeStyle: 'short' }
    );
  };

  const getRoomName = (roomId: string) => rooms.find(r => r.id === roomId)?.name || roomId;

  const inputClass =
    'w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500';
  const labelClass = 'text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 block';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-800">{t(lang, 'integrations.title')}</h1>
          <p className="text-sm text-slate-400 mt-1">{t(lang, 'integrations.emptyHint')}</p>
        </div>
        <div className="flex gap-3">
          {integrations.length > 0 && (
            <button
              onClick={handleSyncAll}
              disabled={syncingAll}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 bg-white text-slate-700 text-sm font-black hover:bg-slate-50 disabled:opacity-50 transition-all"
            >
              <ArrowsClockwise size={16} className={syncingAll ? 'animate-spin' : ''} />
              {syncingAll ? t(lang, 'integrations.syncing') : t(lang, 'integrations.syncAll')}
            </button>
          )}
          <button
            onClick={() => { setShowAddForm(true); setFormError(''); }}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-600 text-white text-sm font-black hover:bg-emerald-700 transition-all"
          >
            <Plus size={16} />
            {t(lang, 'integrations.add')}
          </button>
        </div>
      </div>

      {/* iCal price note */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 text-sm text-amber-800">
        <WarningCircle size={18} className="mt-0.5 shrink-0" />
        <span>{t(lang, 'integrations.priceNote')}</span>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl p-8 space-y-5">
          <h2 className="text-base font-black text-slate-700">{t(lang, 'integrations.add')}</h2>

          <div>
            <label className={labelClass}>{t(lang, 'integrations.channel')}</label>
            <select
              value={form.channelName}
              onChange={e => setForm(f => ({ ...f, channelName: e.target.value }))}
              className={inputClass}
            >
              {Object.entries(CHANNEL_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>{t(lang, 'integrations.room')}</label>
            <select
              value={form.roomId}
              onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}
              className={inputClass}
            >
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>{t(lang, 'integrations.icalUrl')}</label>
            <input
              type="url"
              value={form.icalUrl}
              onChange={e => setForm(f => ({ ...f, icalUrl: e.target.value }))}
              placeholder="https://www.airbnb.com/calendar/ical/..."
              className={inputClass}
              dir="ltr"
            />
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              {CHANNEL_CONFIG[form.channelName]?.hint}
            </p>
          </div>

          {formError && (
            <p className="text-sm text-red-600 font-semibold">{formError}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex-1 bg-emerald-600 text-white py-3 rounded-2xl text-sm font-black hover:bg-emerald-700 disabled:opacity-50 transition-all"
            >
              {saving ? t(lang, 'integrations.syncing') : t(lang, 'integrations.save')}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setFormError(''); }}
              className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-2xl text-sm font-black hover:bg-slate-200 transition-all"
            >
              {t(lang, 'integrations.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12 text-slate-400 text-sm font-semibold">Loading…</div>
      )}

      {/* Empty state */}
      {!loading && integrations.length === 0 && !showAddForm && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl p-12 text-center space-y-3">
          <Link size={40} className="mx-auto text-slate-300" />
          <p className="font-black text-slate-500">{t(lang, 'integrations.empty')}</p>
        </div>
      )}

      {/* Integration Cards */}
      {integrations.map(integration => {
        const cfg = CHANNEL_CONFIG[integration.channelName] || {
          label: integration.channelName,
          color: '#64748b',
          hint: '',
        };
        const isSyncing = syncingIds.has(integration.id);
        const syncMsg = syncMessages[integration.id];

        return (
          <div key={integration.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl p-8 space-y-5">
            {/* Card header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className="px-3 py-1 rounded-full text-white text-xs font-black"
                  style={{ backgroundColor: cfg.color }}
                >
                  {cfg.label}
                </span>
                <span className="text-sm font-black text-slate-700">{getRoomName(integration.roomId)}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${integration.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {integration.isActive ? t(lang, 'integrations.active') : t(lang, 'integrations.inactive')}
                </span>
              </div>
              <button
                onClick={() => handleDelete(integration.id)}
                className="text-slate-300 hover:text-red-500 transition-colors p-1"
                title={t(lang, 'integrations.delete')}
              >
                <Trash size={18} />
              </button>
            </div>

            {/* Masked URL */}
            <div className="flex items-center gap-2 text-slate-400 text-xs font-mono bg-slate-50 rounded-xl px-4 py-2" dir="ltr">
              <Link size={12} />
              <span>{integration.icalUrlMasked}</span>
            </div>

            {/* Sync status + button */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {t(lang, 'integrations.lastSynced')}
                </p>
                <p className="text-sm font-semibold text-slate-600">
                  {formatDate(integration.lastSyncedAt)}
                  {integration.lastSyncCount != null && ` · ${integration.lastSyncCount} events`}
                </p>
                {integration.lastSyncStatus && (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
                    integration.lastSyncStatus === 'success' ? 'bg-emerald-100 text-emerald-700'
                    : integration.lastSyncStatus === 'partial' ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-600'
                  }`}>
                    {integration.lastSyncStatus === 'success' && <CheckCircle size={10} />}
                    {integration.lastSyncStatus === 'error' && <WarningCircle size={10} />}
                    {integration.lastSyncMessage}
                  </span>
                )}
              </div>

              <button
                onClick={() => handleSync(integration.id)}
                disabled={isSyncing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 text-white text-sm font-black hover:bg-emerald-700 disabled:opacity-50 transition-all"
              >
                <ArrowsClockwise size={15} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? t(lang, 'integrations.syncing') : t(lang, 'integrations.syncNow')}
              </button>
            </div>

            {/* Per-card sync result banner */}
            {syncMsg && (
              <div className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-2xl ${syncMsg.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {syncMsg.success ? <CheckCircle size={16} /> : <WarningCircle size={16} />}
                {syncMsg.message}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
