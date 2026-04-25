// Saved-logins multi-account switcher. Stores a list of {tokens, identity} for each
// account the user has logged into; the dropdown in the nav swaps the active token to
// switch between properties. No backend changes — each linked account is its own
// Tenant; this is "saved logins" UX, not multi-tenancy.

const KEY = 'hujuzatk_linked_accounts';

export interface LinkedAccount {
  tenantId: string;
  name: string;
  email: string;
  slug: string;
  token: string;
  refreshToken: string;
  addedAt: string;
}

function safeParse(): LinkedAccount[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function getAccounts(): LinkedAccount[] {
  return safeParse();
}

export function getActiveAccount(): LinkedAccount | null {
  const token = localStorage.getItem('authToken');
  if (!token) return null;
  return safeParse().find((a) => a.token === token) || null;
}

export function addAccount(acc: Omit<LinkedAccount, 'addedAt'>): void {
  const list = safeParse().filter((a) => a.tenantId !== acc.tenantId);
  list.push({ ...acc, addedAt: new Date().toISOString() });
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function removeAccount(tenantId: string): void {
  const list = safeParse().filter((a) => a.tenantId !== tenantId);
  localStorage.setItem(KEY, JSON.stringify(list));
}

/** Swap the active session to another saved account, then full-reload. */
export function setActive(tenantId: string): void {
  const acc = safeParse().find((a) => a.tenantId === tenantId);
  if (!acc) return;
  localStorage.setItem('authToken', acc.token);
  localStorage.setItem('refreshToken', acc.refreshToken);
  // Hard reload so Apollo cache + React state restart cleanly
  window.location.href = `/${encodeURIComponent(acc.slug)}`;
}
