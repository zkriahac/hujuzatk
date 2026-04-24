import { useEffect, useState } from 'react';
import {
  ArrowsClockwise, Trash, WarningCircle, Link as LinkIcon,
  GearSix, X, Plus,
} from 'phosphor-react';
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
  onNavigateToSettings?: () => void;
}

const CHANNELS = ['airbnb', 'gathern', 'booking.com'] as const;
type ChannelKey = typeof CHANNELS[number];

// i18n-key suffix per channel (booking.com has a dot so can't be used directly in keys)
const CHANNEL_I18N: Record<ChannelKey, string> = {
  airbnb: 'airbnb',
  gathern: 'gathern',
  'booking.com': 'booking',
};

const CHANNEL_COLORS: Record<ChannelKey, string> = {
  airbnb: '#FF5A5F',
  gathern: '#00C896',
  'booking.com': '#003580',
};

const channelLabel = (lang: Language, ch: ChannelKey) => t(lang, `channel.${CHANNEL_I18N[ch]}.label`);
const channelHint  = (lang: Language, ch: ChannelKey) => t(lang, `channel.${CHANNEL_I18N[ch]}.hint`);

interface ChannelIntegration {
  id: string;
  channelName: string;
  roomId: string;
  icalUrlMasked: string;
  label: string | null;
  isActive: boolean;
  lastSyncedAt: string | null;
  lastSyncStatus: string | null;
  lastSyncMessage: string | null;
  lastSyncCount: number | null;
}

interface ModalState {
  roomId: string;
  channel: ChannelKey;
  existing: ChannelIntegration | null;
}

export default function IntegrationsView({ session, lang, onNavigateToSettings }: IntegrationsViewProps) {
  // Feature gate — admin can disable integrations per tenant
  if (session.tenant.integrationsEnabled === false) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl p-10 space-y-4">
          <WarningCircle size={40} weight="duotone" className="text-amber-500 mx-auto" />
          <h2 className="text-xl font-black text-slate-800">{t(lang, 'integrations.disabledTitle')}</h2>
          <p className="text-sm text-slate-500 leading-relaxed">{t(lang, 'integrations.disabledBody')}</p>
        </div>
      </div>
    );
  }

  const rooms: { id: string; name: string }[] = session.tenant.rooms || [];
  const isRtl = lang === 'ar';

  const [integrations, setIntegrations] = useState<ChannelIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [syncingAll, setSyncingAll] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);

  const loadIntegrations = async () => {
    try {
      const { data } = await apolloClient.query({
        query: GET_CHANNEL_INTEGRATIONS_QUERY,
        fetchPolicy: 'network-only',
      });
      setIntegrations((data as any)?.getChannelIntegrations || []);
    } catch {
      // Silent — apollo error link handles auth redirects
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadIntegrations(); }, []);

  const findIntegration = (roomId: string, channel: ChannelKey): ChannelIntegration | null =>
    integrations.find(i => i.roomId === roomId && i.channelName === channel) ?? null;

  const handleSync = async (id: string) => {
    setSyncingIds(prev => new Set(prev).add(id));
    try {
      await apolloClient.mutate({ mutation: SYNC_CHANNEL_MUTATION, variables: { id } });
      await loadIntegrations();
    } catch (err: any) {
      alert(err.graphQLErrors?.[0]?.message || err.message || 'Sync failed');
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

  const handleDelete = async (id: string) => {
    if (!confirm(t(lang, 'integrations.delete') + '?')) return;
    try {
      await apolloClient.mutate({ mutation: DELETE_CHANNEL_INTEGRATION_MUTATION, variables: { id } });
      await loadIntegrations();
    } catch (err: any) {
      alert(err.graphQLErrors?.[0]?.message || err.message || 'Delete failed');
    }
  };

  const handleSave = async (input: { id?: string; channel: ChannelKey; roomId: string; icalUrl: string; label: string }) => {
    await apolloClient.mutate({
      mutation: SAVE_CHANNEL_INTEGRATION_MUTATION,
      variables: {
        input: {
          ...(input.id && { id: input.id }),
          channelName: input.channel,
          roomId: input.roomId,
          icalUrl: input.icalUrl.trim(),
          label: input.label.trim() || null,
        },
      },
    });
    await loadIntegrations();
  };

  // ---- Empty room state ---------------------------------------------------
  if (rooms.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl p-10 space-y-5">
          <GearSix size={40} weight="duotone" className="text-emerald-500 mx-auto" />
          <h2 className="text-xl font-black text-slate-800">{t(lang, 'integrations.noRoomsTitle')}</h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto">{t(lang, 'integrations.noRoomsBody')}</p>
          {onNavigateToSettings && (
            <button
              onClick={onNavigateToSettings}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm px-5 py-3 rounded-2xl"
            >
              {t(lang, 'integrations.noRoomsCta')}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ---- Matrix UI ----------------------------------------------------------
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-800">{t(lang, 'integrations.title')}</h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">{t(lang, 'integrations.icalInstructions')}</p>
        </div>
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
      </div>

      {/* Price-note banner */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 text-sm text-amber-800">
        <WarningCircle size={18} className="mt-0.5 shrink-0" />
        <span>{t(lang, 'integrations.priceNote')}</span>
      </div>

      {loading && (
        <div className="text-center py-12 text-slate-400 text-sm font-semibold">Loading…</div>
      )}

      {/* Matrix */}
      {!loading && (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-start text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {t(lang, 'integrations.matrixRoomCol')}
                  </th>
                  {CHANNELS.map((ch) => (
                    <th key={ch} className="px-4 py-4 text-start">
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-[11px] font-black"
                        style={{ backgroundColor: CHANNEL_COLORS[ch] }}
                      >
                        {channelLabel(lang, ch)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-6 py-5 font-black text-slate-800 whitespace-nowrap">{room.name}</td>
                    {CHANNELS.map((ch) => {
                      const integ = findIntegration(room.id, ch);
                      const isSyncing = integ ? syncingIds.has(integ.id) : false;
                      return (
                        <td key={ch} className="px-4 py-4 align-top">
                          {integ ? (
                            <ConnectedCell
                              integration={integ}
                              isSyncing={isSyncing}
                              lang={lang}
                              onEdit={() => setModal({ roomId: room.id, channel: ch, existing: integ })}
                              onSync={() => handleSync(integ.id)}
                              onDelete={() => handleDelete(integ.id)}
                            />
                          ) : (
                            <button
                              onClick={() => setModal({ roomId: room.id, channel: ch, existing: null })}
                              className="w-full min-w-[140px] flex items-center justify-center gap-1.5 border-2 border-dashed border-slate-200 hover:border-emerald-400 text-slate-400 hover:text-emerald-600 rounded-xl px-3 py-3 text-xs font-black transition-colors"
                            >
                              <Plus size={14} weight="bold" />
                              {t(lang, 'integrations.connect')}
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <IntegrationModal
          state={modal}
          lang={lang}
          onClose={() => setModal(null)}
          onSave={async (input) => { await handleSave(input); setModal(null); }}
          onDelete={async (id) => { await handleDelete(id); setModal(null); }}
        />
      )}
    </div>
  );
}

// ---- Connected cell ----------------------------------------------------
function ConnectedCell(props: {
  integration: ChannelIntegration;
  isSyncing: boolean;
  lang: Language;
  onEdit: () => void;
  onSync: () => void;
  onDelete: () => void;
}) {
  const { integration: i, isSyncing, lang, onEdit, onSync, onDelete } = props;
  const statusColor =
    i.lastSyncStatus === 'success' ? 'bg-emerald-500'
    : i.lastSyncStatus === 'suspicious' || i.lastSyncStatus === 'partial' ? 'bg-amber-500'
    : i.lastSyncStatus === 'error' ? 'bg-red-500'
    : 'bg-slate-300';

  return (
    <div className="min-w-[180px] bg-emerald-50/50 border border-emerald-100 rounded-xl px-3 py-2.5 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${statusColor} shrink-0`} />
        <span className="text-xs font-black text-emerald-700">
          {i.label || t(lang, 'integrations.connected')}
        </span>
      </div>
      <div className="text-[10px] text-slate-400 font-mono truncate" dir="ltr" title={i.icalUrlMasked}>
        {i.icalUrlMasked}
      </div>
      <div className="flex items-center gap-1.5 pt-1">
        <button
          onClick={onSync}
          disabled={isSyncing}
          title={t(lang, 'integrations.syncNow')}
          className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-700 disabled:opacity-40"
        >
          <ArrowsClockwise size={14} weight="bold" className={isSyncing ? 'animate-spin' : ''} />
        </button>
        <button
          onClick={onEdit}
          title={t(lang, 'integrations.edit')}
          className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-700"
        >
          <LinkIcon size={14} weight="bold" />
        </button>
        <button
          onClick={onDelete}
          title={t(lang, 'integrations.delete')}
          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"
        >
          <Trash size={14} weight="bold" />
        </button>
      </div>
    </div>
  );
}

// ---- Modal -------------------------------------------------------------
function IntegrationModal(props: {
  state: ModalState;
  lang: Language;
  onClose: () => void;
  onSave: (input: { id?: string; channel: ChannelKey; roomId: string; icalUrl: string; label: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { state, lang, onClose, onSave, onDelete } = props;
  const isRtl = lang === 'ar';
  const channelColor = CHANNEL_COLORS[state.channel];
  const channelLabelText = channelLabel(lang, state.channel);
  const channelHintText = channelHint(lang, state.channel);

  const [icalUrl, setIcalUrl] = useState(state.existing ? '' : '');
  const [label, setLabel] = useState(state.existing?.label || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const editing = !!state.existing;

  const handleSave = async () => {
    setError('');
    // When editing, allow blank URL to mean "keep current URL" — resolver accepts empty by checking .startsWith
    const url = icalUrl.trim();
    if (!editing && !url.startsWith('http')) {
      setError('Please enter a valid iCal URL starting with http');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...(state.existing && { id: state.existing.id }),
        channel: state.channel,
        roomId: state.roomId,
        // If editing without changing URL, send the existing masked URL? No — backend validates starts with http.
        // Simplest: require URL re-entry on edit (masked URL never leaves the DB).
        icalUrl: url,
        label,
      });
    } catch (err: any) {
      setError(err.graphQLErrors?.[0]?.message || err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!state.existing) return;
    if (!confirm(`${t(lang, 'integrations.delete')}?`)) return;
    await onDelete(state.existing.id);
  };

  const inputClass = 'w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500';
  const labelClass = 'text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 block';

  return (
    <div
      className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-7 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className={`absolute top-4 ${isRtl ? 'left-4' : 'right-4'} text-slate-400 hover:text-slate-800`}
        >
          <X size={20} weight="bold" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <span
            className="px-3 py-1 rounded-full text-white text-xs font-black"
            style={{ backgroundColor: channelColor }}
          >
            {channelLabelText}
          </span>
          <span className="text-xs text-slate-500 font-bold">
            {editing ? t(lang, 'integrations.edit') : t(lang, 'integrations.connect')}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>{t(lang, 'integrations.icalUrl')}</label>
            <input
              type="url"
              value={icalUrl}
              onChange={(e) => setIcalUrl(e.target.value)}
              placeholder={editing ? state.existing!.icalUrlMasked : 'https://www.airbnb.com/calendar/ical/...'}
              className={inputClass}
              dir="ltr"
              autoFocus
            />
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{channelHintText}</p>
          </div>

          <div>
            <label className={labelClass}>{t(lang, 'integrations.label')}</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t(lang, 'integrations.labelPlaceholder')}
              className={inputClass}
              maxLength={60}
            />
            <p className="text-[11px] text-slate-400 mt-1.5">{t(lang, 'integrations.labelHint')}</p>
          </div>

          {error && <p className="text-sm text-red-600 font-semibold">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-emerald-600 text-white py-3 rounded-2xl text-sm font-black hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? t(lang, 'integrations.syncing') : t(lang, 'integrations.save')}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-2xl text-sm font-black hover:bg-slate-200"
            >
              {t(lang, 'integrations.cancel')}
            </button>
          </div>
          {editing && (
            <button
              onClick={handleDelete}
              className="w-full text-xs font-black text-red-500 hover:text-red-700 py-2"
            >
              {t(lang, 'integrations.delete')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
