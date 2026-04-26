import { useEffect, useRef, useState } from 'react';
import { Check, Plus, SignOut, X, UsersThree } from 'phosphor-react';
import { cn } from '../utils/cn';
import { t, type Language } from '../lib/i18n';
import { addAccount, getAccounts, removeAccount, setActive, type LinkedAccount } from '../lib/accountStore';
import { apolloClient } from '../lib/apolloClient';
import { LOGIN_MUTATION } from '../lib/graphql';

interface Props {
  lang: Language;
  isRtl: boolean;
  currentTenantId: string | null;
}

export default function AccountSwitcher({ lang, isRtl, currentTenantId }: Props) {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setAccounts(getAccounts()); }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handleSwitch = (id: string) => {
    if (id === currentTenantId) return;
    setActive(id);
  };

  const handleRemove = (id: string) => {
    removeAccount(id);
    setAccounts(getAccounts());
  };

  return (
    <div className="relative" ref={ref}>
      {/* Icon-only trigger so the nav stays stable between hydration states (no name flash) */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
        title={t(lang, 'account.switch')}
        aria-label={t(lang, 'account.switch')}
      >
        <UsersThree size={16} weight="bold" />
      </button>

      {open && (
        <>
          <div className={cn(
            'absolute top-full mt-1 z-100 bg-white rounded-2xl border border-slate-200 shadow-2xl py-2 min-w-[240px]',
            isRtl ? 'left-0' : 'right-0',
          )}>
            <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
              {t(lang, 'account.linkedAccounts')}
            </div>
            {accounts.length === 0 && (
              <div className="px-4 py-3 text-xs text-slate-500">
                {t(lang, 'account.noLinkedYet')}
              </div>
            )}
            {accounts.map((a) => {
              const active = a.tenantId === currentTenantId;
              return (
                <div
                  key={a.tenantId}
                  className={cn('group flex items-center gap-2 px-3 py-2 text-xs transition-colors', active ? 'bg-emerald-50' : 'hover:bg-slate-50')}
                >
                  <button
                    onClick={() => handleSwitch(a.tenantId)}
                    className="flex-1 text-start min-w-0"
                  >
                    <div className="font-black text-slate-800 truncate">{a.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{a.email}</div>
                  </button>
                  {active && <Check size={14} weight="bold" className="text-emerald-600 shrink-0" />}
                  {!active && (
                    <button
                      onClick={() => handleRemove(a.tenantId)}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1"
                      title={t(lang, 'account.remove')}
                    >
                      <SignOut size={14} weight="bold" />
                    </button>
                  )}
                </div>
              );
            })}
            <button
              onClick={() => { setShowAdd(true); setOpen(false); }}
              className="w-full px-4 py-2.5 text-xs font-black text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center gap-2 border-t border-slate-100"
            >
              <Plus size={14} weight="bold" />
              {t(lang, 'account.addAnother')}
            </button>
          </div>
        </>
      )}

      {showAdd && (
        <AddAccountModal
          lang={lang}
          isRtl={isRtl}
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false);
            setAccounts(getAccounts());
          }}
        />
      )}
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
      const { data } = await apolloClient.mutate({
        mutation: LOGIN_MUTATION,
        variables: { email, password },
      });
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
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-6 relative"
      >
        <button type="button" onClick={onClose} className={cn('absolute top-4 text-slate-400 hover:text-slate-700', isRtl ? 'left-4' : 'right-4')}>
          <X size={18} weight="bold" />
        </button>
        <h3 className="text-lg font-black text-slate-900 mb-1">{t(lang, 'account.addAccountTitle')}</h3>
        <p className="text-xs text-slate-500 mb-4">{t(lang, 'account.addAccountSub')}</p>
        <input
          type="email"
          required
          autoFocus
          placeholder={t(lang, 'auth.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-black mb-2 focus:ring-2 focus:ring-emerald-500"
        />
        <input
          type="password"
          required
          placeholder={t(lang, 'auth.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-black mb-3 focus:ring-2 focus:ring-emerald-500"
        />
        {error && <p className="text-xs text-red-600 font-semibold mb-2">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-3 rounded-2xl disabled:opacity-50"
        >
          {loading ? '…' : t(lang, 'account.linkAndStay')}
        </button>
        <p className="text-[10px] text-slate-400 mt-3 text-center">{t(lang, 'account.staysActiveNote')}</p>
      </form>
    </div>
  );
}
