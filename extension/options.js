/**
 * HardReload+ (hard-reload-plus) Options Controller
 */

const DEFAULT_SETTINGS = {
  primaryAction: 'popup',
  badgeCounter: true,
  toastNotice: true,
  cacheKillerDomains: [],
  purgePreferences: {
    cache: true,
    cacheStorage: true,
    localStorage: true,
    sessionStorage: true,
    indexedDB: true,
    serviceWorkers: true,
    cookies: false,
  },
};

let currentSettings = { ...DEFAULT_SETTINGS };

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  renderDomainList();
  bindEvents();
});

async function loadSettings() {
  const data = await chrome.storage.sync.get('settings');
  if (data && data.settings) {
    currentSettings = {
      ...DEFAULT_SETTINGS,
      ...data.settings,
      purgePreferences: {
        ...DEFAULT_SETTINGS.purgePreferences,
        ...(data.settings.purgePreferences || {}),
      },
    };
  }

  // Set action radio
  const actionRadio = document.querySelector(`input[name="primaryAction"][value="${currentSettings.primaryAction}"]`);
  if (actionRadio) actionRadio.checked = true;

  // Set purge checkboxes
  const p = currentSettings.purgePreferences;
  document.getElementById('purge-cache').checked = !!p.cache;
  document.getElementById('purge-sw').checked = !!p.serviceWorkers;
  document.getElementById('purge-local').checked = !!p.localStorage;
  document.getElementById('purge-session').checked = !!p.sessionStorage;
  document.getElementById('purge-idb').checked = !!p.indexedDB;
  document.getElementById('purge-cachestorage').checked = !!p.cacheStorage;
  document.getElementById('purge-cookies').checked = !!p.cookies;
}

function renderDomainList() {
  const listEl = document.getElementById('killer-domains-list');
  const domains = currentSettings.cacheKillerDomains || [];

  if (domains.length === 0) {
    listEl.innerHTML = `<div class="text-xs text-zinc-500 italic p-2">No domains configured. Toggle from popup or add a domain above.</div>`;
    return;
  }

  listEl.innerHTML = domains.map((d) => `
    <div class="flex items-center justify-between p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-xs">
      <div class="flex items-center gap-2">
        <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
        <span class="font-mono text-zinc-200">${escapeHtml(d)}</span>
      </div>
      <button data-domain="${escapeHtml(d)}" class="btn-remove-domain p-1 text-zinc-400 hover:text-red-400 hover:bg-zinc-700/60 rounded transition-colors">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
      </button>
    </div>
  `).join('');

  listEl.querySelectorAll('.btn-remove-domain').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetDomain = btn.getAttribute('data-domain');
      currentSettings.cacheKillerDomains = currentSettings.cacheKillerDomains.filter((d) => d !== targetDomain);
      renderDomainList();
    });
  });
}

function bindEvents() {
  // Add domain
  const inputDomain = document.getElementById('input-domain');
  const btnAddDomain = document.getElementById('btn-add-domain');

  const addDomainHandler = () => {
    let val = inputDomain.value.trim().toLowerCase();
    if (!val) return;
    try {
      if (val.includes('://')) {
        val = new URL(val).hostname;
      }
    } catch (e) {}

    if (!currentSettings.cacheKillerDomains.includes(val)) {
      currentSettings.cacheKillerDomains.push(val);
      renderDomainList();
      inputDomain.value = '';
    }
  };

  btnAddDomain.addEventListener('click', addDomainHandler);
  inputDomain.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addDomainHandler();
  });

  // Save Settings
  document.getElementById('btn-save-settings').addEventListener('click', async () => {
    const selectedAction = document.querySelector('input[name="primaryAction"]:checked')?.value || 'popup';
    
    currentSettings.primaryAction = selectedAction;
    currentSettings.purgePreferences = {
      cache: document.getElementById('purge-cache').checked,
      serviceWorkers: document.getElementById('purge-sw').checked,
      localStorage: document.getElementById('purge-local').checked,
      sessionStorage: document.getElementById('purge-session').checked,
      indexedDB: document.getElementById('purge-idb').checked,
      cacheStorage: document.getElementById('purge-cachestorage').checked,
      cookies: document.getElementById('purge-cookies').checked,
    };

    await chrome.storage.sync.set({ settings: currentSettings });

    const statusEl = document.getElementById('save-status');
    statusEl.classList.remove('hidden');
    setTimeout(() => {
      statusEl.classList.add('hidden');
    }, 2500);
  });

  // Reset Defaults
  document.getElementById('btn-reset-defaults').addEventListener('click', async () => {
    currentSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    await chrome.storage.sync.set({ settings: currentSettings });
    await loadSettings();
    renderDomainList();

    const statusEl = document.getElementById('save-status');
    statusEl.textContent = 'Reset to factory defaults.';
    statusEl.classList.remove('hidden');
    setTimeout(() => {
      statusEl.textContent = 'Preferences saved successfully.';
      statusEl.classList.add('hidden');
    }, 2500);
  });

  // Customize Shortcuts
  document.getElementById('btn-custom-shortcuts').addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });
}

function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
