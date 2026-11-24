/**
 * HardReload+ (hard-reload-plus)
 * Diagnostic Console Controller
 * Engineered by ProtoXen (https://protoxen.com/)
 */

const DB_NAME = 'hard_reload_test_db';
const STORE_NAME = 'users_cache';
const UNPACKED_PATH = '/home/sajol/Server/Tool/hardreload/extension';

// DOM Elements
const localCountEl = document.getElementById('lab-local-count');
const localPreviewEl = document.getElementById('lab-local-preview');
const sessionCountEl = document.getElementById('lab-session-count');
const sessionPreviewEl = document.getElementById('lab-session-preview');
const idbCountEl = document.getElementById('lab-idb-count');
const idbPreviewEl = document.getElementById('lab-idb-preview');
const swStatusEl = document.getElementById('lab-sw-status');
const swPreviewEl = document.getElementById('lab-sw-preview');
const cookieCountEl = document.getElementById('lab-cookie-count');
const cookiePreviewEl = document.getElementById('lab-cookie-preview');
const cacheStatusEl = document.getElementById('lab-cache-status');
const cachePreviewEl = document.getElementById('lab-cache-preview');
const consoleLatencyEl = document.getElementById('console-latency');
const activeHostEl = document.getElementById('active-console-host');

// 1. LocalStorage Logic
function updateLocalStorageView() {
  const count = window.localStorage.length;
  localCountEl.textContent = `${count} ${count === 1 ? 'key' : 'keys'}`;

  if (count === 0) {
    localPreviewEl.innerHTML = '<span class="text-zinc-600 italic">Empty</span>';
  } else {
    const keys = Object.keys(window.localStorage).slice(0, 4);
    const lines = keys.map((k) => `<div class="truncate"><span class="text-zinc-200 font-medium">${escapeHtml(k)}</span>: ${escapeHtml(window.localStorage.getItem(k) || '')}</div>`);
    if (count > 4) lines.push(`<div class="text-zinc-600 italic">+${count - 4} more items...</div>`);
    localPreviewEl.innerHTML = lines.join('');
  }
}

function seedLocalStorage() {
  window.localStorage.setItem('auth_token', 'jwt_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sajol.hardreload');
  window.localStorage.setItem('user_profile', JSON.stringify({ name: 'Alex Rivers', email: 'alex@example.com', role: 'Staff Engineer' }));
  window.localStorage.setItem('theme_preference', 'zinc-dark');
  window.localStorage.setItem('flags_enabled', JSON.stringify({ cache_buster: true, ddev_proxy: true, instant_reload: true }));
  window.localStorage.setItem('last_checkpoint_timestamp', new Date().toISOString());
  updateLocalStorageView();
}

function wipeLocalStorage() {
  window.localStorage.clear();
  updateLocalStorageView();
}

// 2. SessionStorage Logic
function updateSessionStorageView() {
  const count = window.sessionStorage.length;
  sessionCountEl.textContent = `${count} ${count === 1 ? 'key' : 'keys'}`;

  if (count === 0) {
    sessionPreviewEl.innerHTML = '<span class="text-zinc-600 italic">Empty</span>';
  } else {
    const keys = Object.keys(window.sessionStorage).slice(0, 4);
    const lines = keys.map((k) => `<div class="truncate"><span class="text-zinc-200 font-medium">${escapeHtml(k)}</span>: ${escapeHtml(window.sessionStorage.getItem(k) || '')}</div>`);
    if (count > 4) lines.push(`<div class="text-zinc-600 italic">+${count - 4} more items...</div>`);
    sessionPreviewEl.innerHTML = lines.join('');
  }
}

function seedSessionStorage() {
  window.sessionStorage.setItem('session_tab_uuid', 'sess_9934e81a-281b');
  window.sessionStorage.setItem('scroll_position_y', '420');
  window.sessionStorage.setItem('active_tab_filter', 'diagnostics');
  window.sessionStorage.setItem('temporary_csrf_nonce', '98fa2094ec8190');
  window.sessionStorage.setItem('draft_payload_cache', '{"status":"ready"}');
  updateSessionStorageView();
}

function wipeSessionStorage() {
  window.sessionStorage.clear();
  updateSessionStorageView();
}

// 3. IndexedDB Logic
function openTestDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function updateIndexedDBView() {
  if (!window.indexedDB) {
    idbCountEl.textContent = 'Unsupported';
    idbPreviewEl.textContent = 'IndexedDB not supported in this browser';
    return;
  }

  try {
    const db = await openTestDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const countReq = store.count();

    countReq.onsuccess = () => {
      const count = countReq.result;
      idbCountEl.textContent = `${count} ${count === 1 ? 'record' : 'records'}`;

      if (count === 0) {
        idbPreviewEl.innerHTML = '<span class="text-zinc-600 italic">Store is empty (0 records)</span>';
      } else {
        idbPreviewEl.innerHTML = `<div class="text-zinc-200 font-medium">Database: ${DB_NAME}</div><div>Object store "${STORE_NAME}" has ${count} records.</div>`;
      }
      db.close();
    };

    countReq.onerror = () => {
      db.close();
    };
  } catch (err) {
    idbCountEl.textContent = '0 records';
    idbPreviewEl.innerHTML = '<span class="text-zinc-600 italic">Database not initialized</span>';
  }
}

async function seedIndexedDB() {
  const db = await openTestDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  const mockUsers = [
    { name: 'Sarah Chen', title: 'VP of Engineering', department: 'Core Infra' },
    { name: 'Marcus Brody', title: 'Frontend Lead', department: 'UI Engineering' },
    { name: 'Elena Rostova', title: 'Security Architect', department: 'SecOps' },
    { name: 'Liam Gallagher', title: 'DevOps Engineer', department: 'SRE' },
    { name: 'Aria Takahashi', title: 'Performance Specialist', department: 'Speed Lab' },
  ];

  mockUsers.forEach((user) => store.add(user));

  tx.oncomplete = () => {
    db.close();
    updateIndexedDBView();
  };
}

async function wipeIndexedDB() {
  const req = indexedDB.deleteDatabase(DB_NAME);
  req.onsuccess = () => {
    updateIndexedDBView();
  };
}

// 4. Service Worker Logic
async function updateServiceWorkerView() {
  if (!('serviceWorker' in navigator)) {
    swStatusEl.textContent = 'Not Supported';
    swPreviewEl.textContent = 'ServiceWorker API not supported in this context';
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  if (registrations.length > 0) {
    swStatusEl.textContent = 'Active (1 SW)';
    swStatusEl.className = 'text-xs font-mono text-emerald-400';
    swPreviewEl.innerHTML = `<div class="text-emerald-400 font-medium">Service Worker Active</div><div class="truncate text-zinc-400 font-mono">Scope: ${registrations[0].scope}</div>`;
  } else {
    swStatusEl.textContent = 'Inactive';
    swStatusEl.className = 'text-xs font-mono text-zinc-500';
    swPreviewEl.innerHTML = '<span class="text-zinc-600 italic">Not registered</span>';
  }
}

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw-test.js');
      await updateServiceWorkerView();
    } catch (e) {
      swPreviewEl.textContent = `Registration error: ${e.message}`;
    }
  }
}

async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) {
      await r.unregister();
    }
    await updateServiceWorkerView();
  }
}

// 5. Cookies Logic
function parseCookies() {
  const str = document.cookie;
  if (!str) return [];
  return str.split(';').map((s) => s.trim()).filter(Boolean).map((pair) => {
    const idx = pair.indexOf('=');
    return {
      name: idx !== -1 ? pair.substring(0, idx) : pair,
      value: idx !== -1 ? pair.substring(idx + 1) : '',
    };
  });
}

function updateCookiesView() {
  const cookies = parseCookies();
  const count = cookies.length;
  cookieCountEl.textContent = `${count} ${count === 1 ? 'cookie' : 'cookies'}`;

  if (count === 0) {
    cookiePreviewEl.innerHTML = '<span class="text-zinc-600 italic">No cookies found</span>';
  } else {
    const lines = cookies.slice(0, 4).map((c) => `<div class="truncate"><span class="text-zinc-200 font-medium">${escapeHtml(c.name)}</span>: ${escapeHtml(c.value)}</div>`);
    if (count > 4) lines.push(`<div class="text-zinc-600 italic">+${count - 4} more cookies...</div>`);
    cookiePreviewEl.innerHTML = lines.join('');
  }
}

function seedCookies() {
  const date = new Date();
  date.setTime(date.getTime() + (7 * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `hardreload_session=sess_9401829; ${expires}; path=/; SameSite=Lax`;
  document.cookie = `auth_verified=true; ${expires}; path=/; SameSite=Lax`;
  document.cookie = `preferred_theme=zinc_dark; ${expires}; path=/; SameSite=Lax`;
  updateCookiesView();
}

function wipeCookies() {
  const cookies = parseCookies();
  for (const c of cookies) {
    document.cookie = `${c.name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
  updateCookiesView();
}

// 6. HTTP Network Cache Probe Logic
async function probeCachedAsset(bust = false) {
  cacheStatusEl.textContent = 'Probing...';
  const start = performance.now();
  const url = bust ? `/icons/icon-128.png?_bust=${Date.now()}` : '/icons/icon-128.png';

  try {
    const res = await fetch(url);
    const elapsed = Math.round(performance.now() - start);
    const status = res.status;
    const type = res.headers.get('content-type') || 'image/png';

    cacheStatusEl.textContent = `${elapsed} ms`;
    cacheStatusEl.className = 'text-xs font-mono text-emerald-400 tabular-nums';

    if (consoleLatencyEl) {
      consoleLatencyEl.textContent = `Probe Latency: ${elapsed}ms`;
    }

    cachePreviewEl.innerHTML = `
      <div class="flex items-center justify-between text-zinc-300">
        <span class="font-medium text-emerald-400">HTTP Status: ${status}</span>
        <span class="font-mono tabular-nums text-zinc-400">${elapsed}ms</span>
      </div>
      <div class="truncate text-zinc-400 mt-1">${escapeHtml(url)}</div>
      <div class="text-[10px] text-zinc-500 mt-0.5">Content-Type: ${type}</div>
    `;
  } catch (err) {
    cacheStatusEl.textContent = 'Failed';
    cachePreviewEl.textContent = `Fetch error: ${err.message}`;
  }
}

// Helper: Escape HTML
function escapeHtml(str) {
  return String(str).replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Master Seed & Clear
function seedAll() {
  seedLocalStorage();
  seedSessionStorage();
  seedIndexedDB();
  registerServiceWorker();
  seedCookies();
  probeCachedAsset(false);
}

function clearAll() {
  wipeLocalStorage();
  wipeSessionStorage();
  wipeIndexedDB();
  unregisterServiceWorker();
  wipeCookies();
  cacheStatusEl.textContent = 'Idle';
  cachePreviewEl.innerHTML = '<span class="text-zinc-600 italic">All layers cleared</span>';
}

// Export State as JSON
function exportStateAsJson() {
  const state = {
    generatedAt: new Date().toISOString(),
    publisher: 'ProtoXen (https://protoxen.com/)',
    origin: window.location.origin,
    localStorage: { ...window.localStorage },
    sessionStorage: { ...window.sessionStorage },
    cookies: parseCookies(),
  };

  const jsonStr = JSON.stringify(state, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hardreload-diagnostic-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Setup Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  if (activeHostEl) {
    activeHostEl.textContent = window.location.host || 'hardreload.ddev.site';
  }

  // Initial views
  updateLocalStorageView();
  updateSessionStorageView();
  updateIndexedDBView();
  updateServiceWorkerView();
  updateCookiesView();

  // Master Lab Buttons
  document.getElementById('btn-seed-all')?.addEventListener('click', seedAll);
  document.getElementById('btn-clear-all-lab')?.addEventListener('click', clearAll);
  document.getElementById('btn-export-json')?.addEventListener('click', exportStateAsJson);
  document.getElementById('btn-quick-probe')?.addEventListener('click', () => probeCachedAsset(false));

  // Individual Card Buttons
  document.getElementById('btn-seed-local')?.addEventListener('click', seedLocalStorage);
  document.getElementById('btn-wipe-local')?.addEventListener('click', wipeLocalStorage);

  document.getElementById('btn-seed-session')?.addEventListener('click', seedSessionStorage);
  document.getElementById('btn-wipe-session')?.addEventListener('click', wipeSessionStorage);

  document.getElementById('btn-seed-idb')?.addEventListener('click', seedIndexedDB);
  document.getElementById('btn-wipe-idb')?.addEventListener('click', wipeIndexedDB);

  document.getElementById('btn-register-sw')?.addEventListener('click', registerServiceWorker);
  document.getElementById('btn-unregister-sw')?.addEventListener('click', unregisterServiceWorker);

  document.getElementById('btn-seed-cookies')?.addEventListener('click', seedCookies);
  document.getElementById('btn-wipe-cookies')?.addEventListener('click', wipeCookies);

  document.getElementById('btn-probe-cache')?.addEventListener('click', () => probeCachedAsset(false));
  document.getElementById('btn-bust-cache')?.addEventListener('click', () => probeCachedAsset(true));

  // Copy Path Button
  const btnCopy = document.getElementById('btn-hero-copy-path');
  if (btnCopy) {
    btnCopy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(UNPACKED_PATH);
        const originalText = btnCopy.textContent;
        btnCopy.textContent = 'Copied!';
        setTimeout(() => {
          btnCopy.textContent = originalText;
        }, 2000);
      } catch (err) {
        console.error('Clipboard copy error:', err);
      }
    });
  }

  // Storage listener for cross-tab or extension wiping detection
  window.addEventListener('storage', () => {
    updateLocalStorageView();
    updateSessionStorageView();
  });

  // Periodic Poller to detect extension actions immediately
  setInterval(() => {
    updateLocalStorageView();
    updateSessionStorageView();
    updateCookiesView();
  }, 1200);
});
