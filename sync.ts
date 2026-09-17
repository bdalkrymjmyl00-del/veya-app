const AUTH_KEY = 'veya_cloud_auth_v1';
const OFFLINE_KEY = 'veya_offline_mode_v1';

const SNAPSHOT_PREFIXES = ['character_chat_app_', 'veya_memory_', 'app_setting_'];
// Memory settings live under their own key and must follow the user across devices.
const SNAPSHOT_EXACT_KEYS = ['veya_memory_settings_v1'];

export interface CloudAuth {
  token: string;
  email: string;
  userId: string;
}

export function getAuth(): CloudAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setAuth(auth: CloudAuth | null) {
  if (auth) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
    localStorage.removeItem(OFFLINE_KEY);
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
  window.dispatchEvent(new Event('veya-auth-changed'));
}

export function continueOffline() {
  localStorage.setItem(OFFLINE_KEY, '1');
  window.dispatchEvent(new Event('veya-auth-changed'));
}

export function isOfflineMode() {
  return localStorage.getItem(OFFLINE_KEY) === '1';
}

export function hasCloudAccount() {
  return Boolean(getAuth());
}

export function collectLocalSnapshot(): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (SNAPSHOT_PREFIXES.some((prefix) => key.startsWith(prefix)) || SNAPSHOT_EXACT_KEYS.includes(key))) {
      const value = localStorage.getItem(key);
      if (value !== null) snapshot[key] = value;
    }
  }
  return snapshot;
}

export function applyCloudSnapshot(snapshot: Record<string, string>) {
  for (const prefix of SNAPSHOT_PREFIXES) {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }
  Object.entries(snapshot || {}).forEach(([key, value]) => localStorage.setItem(key, value));
}

export async function registerCloud(email: string, password: string, snapshot: Record<string, string>) {
  const res = await fetch('/api/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, snapshot }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  setAuth(data.auth);
  return data as { auth: CloudAuth; snapshot: Record<string, string> };
}

export async function loginCloud(email: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  setAuth(data.auth);
  return data as { auth: CloudAuth; snapshot: Record<string, string>; hasData: boolean };
}

export async function pullCloud() {
  const auth = getAuth();
  if (!auth) return null;
  const res = await fetch('/api/sync', { headers: { Authorization: `Bearer ${auth.token}` } });
  if (!res.ok) {
    if (res.status === 401) setAuth(null);
    throw new Error('Cloud sync failed');
  }
  const data = await res.json();
  applyCloudSnapshot(data.snapshot || {});
  return data.snapshot as Record<string, string>;
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
export function scheduleCloudSync() {
  if (!getAuth()) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { void pushCloud(); }, 500);
}

export async function pushCloud() {
  const auth = getAuth();
  if (!auth) return;
  const res = await fetch('/api/sync', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
    body: JSON.stringify({ snapshot: collectLocalSnapshot() }),
  });
  if (res.status === 401) setAuth(null);
  if (!res.ok) console.warn('Veya cloud sync failed');
}
