import { useEffect, useRef, useState } from 'react';
import { ArrowsClockwise, Check, GearSix, Plus, SignOut, UserGear, Users, X } from 'phosphor-react';
import { cn } from '../utils/cn';
import { t, type Language } from '../lib/i18n';
import { addAccount, getAccounts, removeAccount, setActive, type LinkedAccount } from '../lib/accountStore';
import { apolloClient } from '../lib/apolloClient';
import { LOGIN_MUTATION } from '../lib/graphql';
import type { SessionUser } from '../lib/authService';

interface Props {
  lang: Language;
  isRtl: boolean;
  currentTenantId: string | null;
  session: SessionUser;
  onLogout: () => void;
  onNavigate: (v: 'settings' | 'integrations') => void;
  /** Render flat (no popup) — used inside the desktop sidebar so the menu doesn't overflow viewport. */
  flat?: boolean;
}

export default function AccountSwitcher({ lang, isRtl, currentTenantId, session, onLogout, onNavigate, flat = false }: Props) {
  const [open, setOpen] = useState(false);
  const [showSwitch, setShowSwitch] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (flat || !open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open, flat]);

  const daysUntilExpiry = session.tenant.validUntil
    ? Math.ceil((new Date(session.tenant.validUntil).getTime() - Date.now()) / 86400000)
    : null;
  const isExpiring = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
  const status = session.tenant.subscriptionStatus;
  const statusColor =
    isExpired  ? 'bg-red-100 text-red-700' :
    isExpiring ? 'bg-amber-100 text-amber-700' :
    status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
    status === 'TRIAL'  ? 'bg-blue-100 text-blue-700' :
    'bg-slate-100 text-slate-600';
  const statusDot =
    isExpired  ? 'bg-red-500' :
    isExpiring ? 'bg-amber-500' :
    status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-blue-500';

  const initial = (session.tenant.name || 'H')[0].toUpperCase();

  // ── Shared menu body (used in both popup and flat modes) ──
  const MenuBody = (
    <>
      {/* Profile card */}
      <div className={cn('flex items-start gap-3', flat ? 'px-2 py-2' : 'px-4 py-3')}>
        <div className={cn('rounded-full bg-emerald-600 text-white font-black flex items-center justify-center shrink-0',
          flat ? 'w-9 h-9 text-base' : 'w-10 h-10 text-lg')}>
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-black text-slate-900 text-sm truncate leading-tight">{session.tenant.name}</div>
          {session.tenant.companyName && (
            <div className="text-xs text-slate-500 font-semibold truncate mt-0.5">{session.tenant.companyName}</div>
          )}
          <div className="text-[10px] text-slate-400 truncate mt-0.5">{session.tenant.email}</div>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className={cn('inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-black uppercase', statusColor)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', statusDot)} />
              {t(lang, `status.${status.toLowerCase()}`)}
            </span>
            {session.tenant.plan && (
              <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-black uppercase bg-slate-100 text-slate-600">
                {session.tenant.plan.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 my-1" />

      {/* Navigation shortcuts — in flat mode, settings/integrations are already in the
          sidebar's main nav, so we hide them here to avoid duplication. */}
      {!flat && (
        <>
          <button
            onClick={() => { onNavigate('settings'); setOpen(false); }}
            className="w-full px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors flex items-center gap-2.5 text-start"
          >
            <GearSix size={15} weight="bold" />
            {t(lang, 'nav.settings')}
          </button>
          {session.tenant.integrationsEnabled !== false && (
            <button
              onClick={() => { onNavigate('integrations'); setOpen(false); }}
              className="w-full px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors flex items-center gap-2.5 text-start"
            >
              <ArrowsClockwise size={15} weight="bold" />
              {t(lang, 'nav.integrations')}
            </button>
          )}
          <div className="border-t border-slate-100 my-1" />
        </>
      )}

      {/* Switch account */}
      <button
        onClick={() => { setShowSwitch(true); setOpen(false); }}
        className={cn(
          'w-full text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors flex items-center gap-2.5 text-start',
          flat ? 'px-3 py-2.5 rounded-xl' : 'px-4 py-2.5',
        )}
      >
        <Users size={15} weight="bold" />
        {t(lang, 'account.switch')}
      </button>

      {!flat && <div className="border-t border-slate-100 my-1" />}

      {/* Logout */}
      <button
        onClick={() => { onLogout(); setOpen(false); }}
        className={cn(
          'w-full text-[11px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2.5 text-start',
          flat ? 'px-3 py-2.5 rounded-xl mt-0.5' : 'px-4 py-2.5',
        )}
      >
        <SignOut size={15} weight="bold" />
        {t(lang, 'misc.logout')}
      </button>
    </>
  );

  // ── Flat mode (sidebar footer) — no popup, no toggle button ──
  if (flat) {
    return (
      <div className="space-y-0">
        {MenuBody}
        {showSwitch && (
          <SwitchAccountModal
            lang={lang}
            isRtl={isRtl}
            currentTenantId={currentTenantId}
            session={session}
            onClose={() => setShowSwitch(false)}
            onSwitch={(id) => { setActive(id); setShowSwitch(false); }}
          />
        )}
      </div>
    );
  }

  // ── Popup mode (mobile top bar) ──
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] sm:text-[11px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors"
        aria-label={t(lang, 'account.switch')}
      >
        <UserGear size={18} weight="bold" />
      </button>

      {open && (
        <div className="absolute top-full mt-2 z-100 bg-white rounded-2xl border border-slate-200 shadow-2xl py-2 w-72 end-0">
          {MenuBody}
        </div>
      )}

      {showSwitch && (
        <SwitchAccountModal
          lang={lang}
          isRtl={isRtl}
          currentTenantId={currentTenantId}
          session={session}
          onClose={() => setShowSwitch(false)}
          onSwitch={(id) => { setActive(id); setShowSwitch(false); }}
        />
      )}
    </div>
  );
}

function SwitchAccountModal({
  lang, isRtl, currentTenantId, session, onClose, onSwitch,
}: {
  lang: Language; isRtl: boolean; currentTenantId: string | null;
  session: SessionUser; onClose: () => void; onSwitch: (id: string) => void;
}) {
  const [accounts, setAccounts] = useState<LinkedAccount[]>(getAccounts());
  const [showAdd, setShowAdd] = useState(false);

  const handleRemove = (id: string) => {
    removeAccount(id);
    setAccounts(getAccounts());
  };

  if (showAdd) {
    return (
      <AddAccountModal
        lang={lang}
        isRtl={isRtl}
        onClose={() => setShowAdd(false)}
        onAdded={() => { setShowAdd(false); setAccounts(getAccounts()); }}
      />
    );
  }

  const initial = (session.tenant.name || 'H')[0].toUpperCase();

  return (
    <div
      className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-base font-black text-slate-900">{t(lang, 'account.switch')}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="px-3 pb-2 space-y-1">
          {/* Current session (always shown first) */}
          <div className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-emerald-50 border border-emerald-100">
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-black text-base flex items-center justify-center shrink-0">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-black text-slate-900 text-sm truncate">{session.tenant.name}</div>
              <div className="text-[10px] text-slate-400 truncate">{session.tenant.email}</div>
            </div>
            <Check size={16} weight="bold" className="text-emerald-600 shrink-0" />
          </div>

          {/* Linked accounts */}
          {accounts.filter(a => a.tenantId !== currentTenantId).map((a) => (
            <div key={a.tenantId} className="group flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-slate-50 transition-colors">
              <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 font-black text-base flex items-center justify-center shrink-0">
                {(a.name || '?')[0].toUpperCase()}
              </div>
              <button onClick={() => onSwitch(a.tenantId)} className="flex-1 text-start min-w-0">
                <div className="font-black text-slate-800 text-sm truncate">{a.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{a.email}</div>
              </button>
              <button
                onClick={() => handleRemove(a.tenantId)}
                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1 shrink-0"
                title={t(lang, 'account.remove')}
              >
                <X size={13} weight="bold" />
              </button>
            </div>
          ))}

          {accounts.filter(a => a.tenantId !== currentTenantId).length === 0 && (
            <p className="text-xs text-slate-400 px-3 py-2">{t(lang, 'account.noLinkedYet')}</p>
          )}
        </div>

        {/* Add account */}
        <div className="px-3 pb-4">
          <button
            onClick={() => setShowAdd(true)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl border border-dashed border-slate-200 text-slate-500 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/50 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <Plus size={16} weight="bold" />
            </div>
            <span className="text-sm font-black">{t(lang, 'account.addAnother')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function AddAccountModal({ lang, isRtl, onClose, onAdded }: { lang: Language; isRtl: boolean; onClose: () => void; onAdded: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await apolloClient.mutate({ mutation: LOGIN_MUTATION, variables: { email, password } });
      const payload = (data as any)?.login;
      if (!payload) throw new Error('Login failed');
      const tenant = payload.tenant;
      addAccount({
        tenantId: tenant.id,
        name: tenant.name,
        email: tenant.email,
        slug: (tenant.name || 'workspace').replace(/\s+/g, '-'),
        token: payload.token,
        refreshToken: payload.refreshToken,
      });
      onAdded();
    } catch (err: any) {
      setError(err.graphQLErrors?.[0]?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose} dir={isRtl ? 'rtl' : 'ltr'}>
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative">
        <button type="button" onClick={onClose} className={cn('absolute top-4 text-slate-400 hover:text-slate-700', isRtl ? 'left-4' : 'right-4')}>
          <X size={18} weight="bold" />
        </button>
        <h3 className="text-lg font-black text-slate-900 mb-1">{t(lang, 'account.addAccountTitle')}</h3>
        <p className="text-xs text-slate-500 mb-4">{t(lang, 'account.addAccountSub')}</p>
        <input
          type="email" required autoFocus placeholder={t(lang, 'auth.email')}
          value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-black mb-2 focus:ring-2 focus:ring-emerald-500"
        />
        <input
          type="password" required placeholder={t(lang, 'auth.password')}
          value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-black mb-3 focus:ring-2 focus:ring-emerald-500"
        />
        {error && <p className="text-xs text-red-600 font-semibold mb-2">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-3 rounded-2xl disabled:opacity-50">
          {loading ? '…' : t(lang, 'account.linkAndStay')}
        </button>
        <p className="text-[10px] text-slate-400 mt-3 text-center">{t(lang, 'account.staysActiveNote')}</p>
      </form>
    </div>
  );
}
