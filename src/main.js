/**
 * HardReload+ (hard-reload-plus)
 * Diagnostic Lab & Live Interactive Simulator Controller
 * Engineered by ProtoXen (https://protoxen.com/)
 */

const DB_NAME = 'hard_reload_test_db';
const STORE_NAME = 'users_cache';
const UNPACKED_PATH = '/home/sajol/Server/Tool/hardreload/extension';

// Elements
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

// Simulator Elements
const simBadge = document.getElementById('sim-badge');
const simFeedback = document.getElementById('sim-feedback');

// 1. LocalStorage Logic
function updateLocalStorageView() {
  const count = window.localStorage.length;
  localCountEl.textContent = `${count} ${count === 1 ? 'key' : 'keys'}`;

  if (count === 0) {
    localPreviewEl.innerHTML = '<span class="text-zinc-500 italic">Empty (No localStorage items)</span>';
    localCountEl.className = 'px-2 py-0.5 rounded text-xs font-mono font-semibold bg-zinc-800 text-zinc-500 tabular-nums';
  } else {
    localCountEl.className = 'px-2 py-0.5 rounded text-xs font-mono font-semibold bg-purple-950 text-purple-300 border border-purple-800/50 tabular-nums';
    const keys = Object.keys(window.localStorage).slice(0, 4);
    const lines = keys.map((k) => `<div class="truncate"><span class="text-purple-400 font-semibold">${escapeHtml(k)}</span>: ${escapeHtml(window.localStorage.getItem(k) || '')}</div>`);
    if (count > 4) lines.push(`<div class="text-zinc-500 italic">+${count - 4} more items...</div>`);
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
  highlightCard('card-local');
}

function wipeLocalStorage() {
  window.localStorage.clear();
  updateLocalStorageView();
  highlightCard('card-local', true);
}

// 2. SessionStorage Logic
function updateSessionStorageView() {
  const count = window.sessionStorage.length;
  sessionCountEl.textContent = `${count} ${count === 1 ? 'key' : 'keys'}`;

  if (count === 0) {
    sessionPreviewEl.innerHTML = '<span class="text-zinc-500 italic">Empty (No sessionStorage items)</span>';
    sessionCountEl.className = 'px-2 py-0.5 rounded text-xs font-mono font-semibold bg-zinc-800 text-zinc-500 tabular-nums';
  } else {
    sessionCountEl.className = 'px-2 py-0.5 rounded text-xs font-mono font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/50 tabular-nums';
    const keys = Object.keys(window.sessionStorage).slice(0, 4);
    const lines = keys.map((k) => `<div class="truncate"><span class="text-cyan-400 font-semibold">${escapeHtml(k)}</span>: ${escapeHtml(window.sessionStorage.getItem(k) || '')}</div>`);
    if (count > 4) lines.push(`<div class="text-zinc-500 italic">+${count - 4} more items...</div>`);
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
  highlightCard('card-session');
}

function wipeSessionStorage() {
  window.sessionStorage.clear();
  updateSessionStorageView();
  highlightCard('card-session', true);
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
        idbPreviewEl.innerHTML = '<span class="text-zinc-500 italic">Store is empty (0 records)</span>';
        idbCountEl.className = 'px-2 py-0.5 rounded text-xs font-mono font-semibold bg-zinc-800 text-zinc-500 tabular-nums';
      } else {
        idbCountEl.className = 'px-2 py-0.5 rounded text-xs font-mono font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/50 tabular-nums';
        idbPreviewEl.innerHTML = `<div class="text-emerald-400 font-semibold">Active Database: ${DB_NAME}</div><div>Object store "${STORE_NAME}" has ${count} records cached.</div>`;
      }
      db.close();
    };

    countReq.onerror = () => {
      db.close();
    };
  } catch (err) {
    idbCountEl.textContent = '0 records';
    idbCountEl.className = 'px-2 py-0.5 rounded text-xs font-mono font-semibold bg-zinc-800 text-zinc-500 tabular-nums';
    idbPreviewEl.innerHTML = '<span class="text-zinc-500 italic">Database not initialized</span>';
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
    highlightCard('card-idb');
  };
}

async function wipeIndexedDB() {
  const req = indexedDB.deleteDatabase(DB_NAME);
  req.onsuccess = () => {
    updateIndexedDBView();
    highlightCard('card-idb', true);
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
    swStatusEl.className = 'px-2 py-0.5 rounded text-xs font-mono font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/50';
    swPreviewEl.innerHTML = `<div class="text-emerald-400 font-semibold">Service Worker Registered</div><div class="truncate text-zinc-300 font-mono">Scope: ${registrations[0].scope}</div>`;
  } else {
    swStatusEl.textContent = 'Inactive';
    swStatusEl.className = 'px-2 py-0.5 rounded text-xs font-mono font-semibold bg-zinc-800 text-zinc-500';
    swPreviewEl.innerHTML = '<span class="text-zinc-500 italic">No active service worker registrations</span>';
  }
}

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw-test.js');
      await updateServiceWorkerView();
      highlightCard('card-sw');
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
    highlightCard('card-sw', true);
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
    cookiePreviewEl.innerHTML = '<span class="text-zinc-500 italic">No cookies found for current domain</span>';
    cookieCountEl.className = 'px-2 py-0.5 rounded text-xs font-mono font-semibold bg-zinc-800 text-zinc-500 tabular-nums';
  } else {
    cookieCountEl.className = 'px-2 py-0.5 rounded text-xs font-mono font-semibold bg-amber-950 text-amber-300 border border-amber-800/50 tabular-nums';
    const lines = cookies.slice(0, 4).map((c) => `<div class="truncate"><span class="text-amber-400 font-semibold">${escapeHtml(c.name)}</span>: ${escapeHtml(c.value)}</div>`);
    if (count > 4) lines.push(`<div class="text-zinc-500 italic">+${count - 4} more cookies...</div>`);
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
  highlightCard('card-cookies');
}

function wipeCookies() {
  const cookies = parseCookies();
  for (const c of cookies) {
    document.cookie = `${c.name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
  updateCookiesView();
  highlightCard('card-cookies', true);
}

// 6. HTTP Network Probe Logic
async function probeCachedAsset(bust = false) {
  cacheStatusEl.textContent = 'Probing...';
  const start = performance.now();
  const url = bust ? `/icons/icon-128.png?_bust=${Date.now()}` : '/icons/icon-128.png';

  try {
    const res = await fetch(url);
    const elapsed = Math.round(performance.now() - start);
    const status = res.status;
    const type = res.headers.get('content-type') || 'binary';

    cacheStatusEl.textContent = `${elapsed} ms`;
    cacheStatusEl.className = 'px-2 py-0.5 rounded text-xs font-mono font-semibold bg-rose-950 text-rose-300 border border-rose-800/50 tabular-nums';

    cachePreviewEl.innerHTML = `
      <div class="flex items-center justify-between text-zinc-300">
        <span class="font-semibold text-rose-400">HTTP Status: ${status}</span>
        <span class="font-mono tabular-nums text-zinc-400">${elapsed}ms latency</span>
      </div>
      <div class="truncate text-zinc-400 mt-1">Resource: ${escapeHtml(url)}</div>
      <div class="text-[10px] text-zinc-500 mt-0.5">Content-Type: ${type}</div>
    `;
    highlightCard('card-cache');
  } catch (err) {
    cacheStatusEl.textContent = 'Failed';
    cachePreviewEl.textContent = `Fetch error: ${err.message}`;
  }
}

// Visual Card Highlight
function highlightCard(cardId, isWipe = false) {
  const el = document.getElementById(cardId);
  if (!el) return;
  el.classList.add(isWipe ? 'border-red-500/80' : 'border-indigo-500/80', 'bg-zinc-850/80');
  setTimeout(() => {
    el.classList.remove('border-red-500/80', 'border-indigo-500/80', 'bg-zinc-850/80');
  }, 800);
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
  showSimFeedback('Populated all 5 diagnostic layers with test data');
}

function clearAll() {
  wipeLocalStorage();
  wipeSessionStorage();
  wipeIndexedDB();
  unregisterServiceWorker();
  wipeCookies();
  cacheStatusEl.textContent = 'Idle';
  cachePreviewEl.innerHTML = 'All client state cleared';
  showSimFeedback('Cleared all client storage layers');
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
  showSimFeedback('Diagnostic state JSON exported');
}

// Simulator Trigger Feedback
function showSimFeedback(text, badge = 'ACTION') {
  if (simFeedback) simFeedback.innerHTML = `<span>${text}</span><span class="text-[10px] text-indigo-400 font-mono">${badge}</span>`;
  if (simBadge) {
    simBadge.textContent = badge;
    simBadge.className = 'px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-900 text-indigo-200 border border-indigo-700';
    setTimeout(() => {
      simBadge.textContent = 'READY';
      simBadge.className = 'px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300';
    }, 1500);
  }
}

// Copy Unpacked Path Helpers
function setupClipboardCopy(buttonId, statusId, textToCopy) {
  const btn = document.getElementById(buttonId);
  const statusEl = statusId ? document.getElementById(statusId) : null;
  if (!btn) return;

  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span class="text-emerald-400 font-semibold">Copied!</span>';
      if (statusEl) statusEl.classList.remove('hidden');

      setTimeout(() => {
        btn.innerHTML = originalText;
        if (statusEl) statusEl.classList.add('hidden');
      }, 2000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  });
}

// Setup Event Listeners
document.addEventListener('DOMContentLoaded', () => {
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

  // Copy Buttons
  setupClipboardCopy('btn-hero-copy-path', 'hero-copy-status', UNPACKED_PATH);
  setupClipboardCopy('nav-btn-copy-path', null, UNPACKED_PATH);

  // Interactive Live Extension Simulator Buttons
  document.getElementById('sim-hard-reload')?.addEventListener('click', () => {
    probeCachedAsset(false);
    showSimFeedback('Hard Reload simulated (Network revalidation)', 'RELOAD');
  });

  document.getElementById('sim-empty-cache')?.addEventListener('click', () => {
    probeCachedAsset(true);
    showSimFeedback('Empty Cache simulated (Origin cache cleared)', 'CACHE');
  });

  document.getElementById('sim-purge-storage')?.addEventListener('click', () => {
    wipeLocalStorage();
    wipeSessionStorage();
    wipeIndexedDB();
    unregisterServiceWorker();
    showSimFeedback('Purge Storage simulated (Local/Session/IDB/SW cleared)', 'WIPED');
  });

  document.getElementById('sim-clear-cookies')?.addEventListener('click', () => {
    wipeCookies();
    showSimFeedback('Clear Cookies simulated (Domain session cookies dropped)', 'COOKIE');
  });

  document.getElementById('sim-nuclear')?.addEventListener('click', () => {
    clearAll();
    showSimFeedback('Nuclear Purge simulated (All storage layers wiped)', 'NUCLEAR');
  });

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
