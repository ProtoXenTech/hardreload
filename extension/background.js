/**
 * HardReload+ (hard-reload-plus)
 * Background Service Worker — Manifest V3
 */

// Default settings
const DEFAULT_SETTINGS = {
  primaryAction: 'popup', // 'popup' | 'hard' | 'cache' | 'storage'
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

// Store active auto-reload timers
const autoReloadState = new Map(); // tabId -> { interval, remaining, alarmName }

// Initialize Extension
chrome.runtime.onInstalled.addListener(async () => {
  // Sync initial settings
  const existing = await chrome.storage.sync.get('settings');
  if (!existing || !existing.settings) {
    await chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
  }

  // Setup Context Menus
  setupContextMenus();
});

// Setup Context Menus
function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'hard_reload',
      title: 'Hard Reload Tab (Alt+Shift+R)',
      contexts: ['action', 'page'],
    });

    chrome.contextMenus.create({
      id: 'empty_cache_reload',
      title: 'Empty Cache & Hard Reload (Alt+Shift+C)',
      contexts: ['action', 'page'],
    });

    chrome.contextMenus.create({
      id: 'purge_storage_reload',
      title: 'Purge Storage & Reload (Alt+Shift+D)',
      contexts: ['action', 'page'],
    });

    chrome.contextMenus.create({
      id: 'clear_cookies_reload',
      title: 'Clear Domain Cookies & Reload',
      contexts: ['action', 'page'],
    });

    chrome.contextMenus.create({
      id: 'nuclear_reload',
      title: 'Nuclear Purge (All Data & Reload)',
      contexts: ['action', 'page'],
    });

    chrome.contextMenus.create({
      id: 'sep_1',
      type: 'separator',
      contexts: ['action', 'page'],
    });

    chrome.contextMenus.create({
      id: 'toggle_cache_killer',
      title: 'Toggle Cache Killer Mode (Alt+Shift+K)',
      contexts: ['action', 'page'],
    });

    chrome.contextMenus.create({
      id: 'sep_2',
      type: 'separator',
      contexts: ['action'],
    });

    chrome.contextMenus.create({
      id: 'open_options',
      title: 'HardReload+ Options...',
      contexts: ['action'],
    });
  });
}

// Helper: Get active tab reliably in MV3 Service Worker
async function getActiveTab() {
  try {
    let [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab) return tab;
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) return tab;
    const allActive = await chrome.tabs.query({ active: true });
    return allActive[0] || null;
  } catch (e) {
    return null;
  }
}

// Unified Command Execution (for chrome.commands and in-page shortcuts)
async function executeCommand(command, tab) {
  if (!tab || !tab.id || !tab.url || tab.url.startsWith('chrome://')) return null;

  const urlObj = new URL(tab.url);

  switch (command) {
    case 'hard-reload-tab':
      return await performHardReload(tab.id);
    case 'empty-cache-reload':
      return await performEmptyCacheReload(tab.id, urlObj.origin);
    case 'purge-storage-reload':
      return await performPurgeStorageReload(tab.id, urlObj.origin);
    case 'toggle-cache-killer':
      return await toggleCacheKiller(tab.id, urlObj.hostname);
    default:
      return null;
  }
}

// Context Menu Click Handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab && info.menuItemId !== 'open_options') {
    tab = await getActiveTab();
  }

  if (info.menuItemId === 'open_options') {
    chrome.runtime.openOptionsPage();
    return;
  }

  if (!tab || !tab.id || !tab.url || tab.url.startsWith('chrome://')) return;

  const urlObj = new URL(tab.url);
  const origin = urlObj.origin;

  switch (info.menuItemId) {
    case 'hard_reload':
      await performHardReload(tab.id);
      break;
    case 'empty_cache_reload':
      await performEmptyCacheReload(tab.id, origin);
      break;
    case 'purge_storage_reload':
      await performPurgeStorageReload(tab.id, origin);
      break;
    case 'clear_cookies_reload':
      await performClearCookiesReload(tab.id, tab.url);
      break;
    case 'nuclear_reload':
      await performNuclearPurge(tab.id, origin, tab.url);
      break;
    case 'toggle_cache_killer':
      await toggleCacheKiller(tab.id, urlObj.hostname);
      break;
  }
});

// Keyboard Commands Handler
chrome.commands.onCommand.addListener(async (command) => {
  const tab = await getActiveTab();
  if (tab) {
    await executeCommand(command, tab);
  }
});

// Tab Update / Activation updates badge
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  updateBadgeForTab(tabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    updateBadgeForTab(tabId);
  }
});

// Update Badge State for active tab
async function updateBadgeForTab(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url || tab.url.startsWith('chrome://')) {
      chrome.action.setBadgeText({ text: '', tabId });
      return;
    }

    const hostname = new URL(tab.url).hostname;
    const isKillerActive = await isCacheKillerActiveForHost(hostname);

    if (autoReloadState.has(tabId)) {
      const state = autoReloadState.get(tabId);
      chrome.action.setBadgeText({ text: `${state.remaining}s`, tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#f59e0b', tabId });
    } else if (isKillerActive) {
      chrome.action.setBadgeText({ text: 'KILL', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#ef4444', tabId });
    } else {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  } catch (err) {
    // Tab might be closing
  }
}

// In-page toast feedback helper
async function showInPageToast(tabId, title, detail) {
  try {
    const data = await chrome.storage.sync.get('settings');
    const toastNotice = data?.settings?.toastNotice !== false;
    if (toastNotice) {
      await chrome.tabs.sendMessage(tabId, {
        type: 'SHOW_PURGE_TOAST',
        title,
        detail,
      });
    }
  } catch (e) {
    // Tab might be chrome:// or content script not ready
  }
}

// 1. Hard Reload Tab
async function performHardReload(tabId) {
  flashBadge(tabId, 'RELOAD', '#4f46e5');
  showInPageToast(tabId, 'Hard Reload', 'Bypassed memory and disk HTTP cache').catch(() => {});
  await chrome.tabs.reload(tabId, { bypassCache: true });
  return { success: true, action: 'hard' };
}

// 2. Empty Cache & Reload (Strictly scoped to active origin, never global)
async function performEmptyCacheReload(tabId, origin) {
  flashBadge(tabId, 'CACHE', '#06b6d4');
  showInPageToast(tabId, 'Cache Cleared', `Origin cache purged: ${origin || 'active domain'}`).catch(() => {});

  try {
    // Clear browsing cache & storage scoped strictly to this specific origin
    if (origin && origin.startsWith('http')) {
      await chrome.browsingData.remove(
        { origins: [origin] },
        { cacheStorage: true, serviceWorkers: true }
      );
    }
  } catch (e) {
    // Never fall back to global removeCache!
  }

  // Force byte-level cache bypass for this active tab only
  await chrome.tabs.reload(tabId, { bypassCache: true });
  return { success: true, action: 'cache' };
}

// In-page script for surgical client storage wiping
function clientStorageWiper() {
  const stats = {
    localStorage: 0,
    sessionStorage: 0,
    indexedDB: 0,
    caches: 0,
    serviceWorkers: 0,
  };

  try {
    stats.localStorage = window.localStorage.length;
    window.localStorage.clear();
  } catch (e) {}

  try {
    stats.sessionStorage = window.sessionStorage.length;
    window.sessionStorage.clear();
  } catch (e) {}

  // Cache Storage API
  if (window.caches && caches.keys) {
    caches.keys().then((keys) => {
      stats.caches = keys.length;
      keys.forEach((key) => caches.delete(key));
    }).catch(() => {});
  }

  // Service Worker Registrations
  if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      stats.serviceWorkers = registrations.length;
      registrations.forEach((reg) => reg.unregister());
    }).catch(() => {});
  }

  // IndexedDB
  if (window.indexedDB && indexedDB.databases) {
    indexedDB.databases().then((dbs) => {
      stats.indexedDB = dbs.length;
      dbs.forEach((db) => {
        if (db.name) indexedDB.deleteDatabase(db.name);
      });
    }).catch(() => {});
  }

  return stats;
}

// 3. Purge Storage & Reload
async function performPurgeStorageReload(tabId, origin) {
  flashBadge(tabId, 'WIPED', '#8b5cf6');

  // Inject in-page wiper
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: clientStorageWiper,
    });
  } catch (e) {
    // Ignore frame injection limits
  }

  // Remove via browsingData API
  try {
    if (origin && origin.startsWith('http')) {
      await chrome.browsingData.remove(
        { origins: [origin] },
        {
          localStorage: true,
          indexedDB: true,
          serviceWorkers: true,
          cacheStorage: true,
        }
      );
    }
  } catch (e) {}

  await chrome.tabs.reload(tabId, { bypassCache: true });
  return { success: true, action: 'storage' };
}

// 4. Clear Cookies & Reload (Strictly scoped to active hostname/subdomain)
async function performClearCookiesReload(tabId, url) {
  flashBadge(tabId, 'COOKIE', '#f97316');

  try {
    const urlObj = new URL(url);
    const activeHost = urlObj.hostname.toLowerCase();
    
    // Fetch cookies visible to this tab's URL
    const cookies = await chrome.cookies.getAll({ url });

    for (const cookie of cookies) {
      const cleanCookieDomain = cookie.domain.replace(/^\./, '').toLowerCase();
      // Strict subdomain separation:
      // Only remove if the cookie specifically belongs to this exact subdomain/host.
      // Example: If on "sub.example.com", ignore cookies belonging to "example.com" or "other.example.com"
      if (cleanCookieDomain === activeHost) {
        const protocol = cookie.secure ? 'https:' : 'http:';
        const cookieUrl = `${protocol}//${cleanCookieDomain}${cookie.path}`;
        await chrome.cookies.remove({
          url: cookieUrl,
          name: cookie.name,
          storeId: cookie.storeId,
        });
      }
    }
  } catch (e) {}

  await chrome.tabs.reload(tabId, { bypassCache: true });
  return { success: true, action: 'cookies' };
}

// 5. Nuclear Purge
async function performNuclearPurge(tabId, origin, url) {
  flashBadge(tabId, 'NUKE', '#ef4444');

  await Promise.allSettled([
    performEmptyCacheReload(tabId, origin),
    performPurgeStorageReload(tabId, origin),
    performClearCookiesReload(tabId, url),
  ]);

  return { success: true, action: 'nuclear' };
}

// Temporary badge flash
function flashBadge(tabId, text, color) {
  chrome.action.setBadgeText({ text, tabId });
  chrome.action.setBadgeBackgroundColor({ color, tabId });
  setTimeout(() => {
    updateBadgeForTab(tabId);
  }, 1600);
}

// Helper: Check if Cache Killer active for domain
async function isCacheKillerActiveForHost(hostname) {
  const data = await chrome.storage.sync.get('settings');
  const domains = data?.settings?.cacheKillerDomains || [];
  return domains.includes(hostname);
}

// Generate unique numeric rule ID from string hostname
function getRuleIdForHost(hostname) {
  let hash = 0;
  for (let i = 0; i < hostname.length; i++) {
    hash = (hash << 5) - hash + hostname.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 100000 + 100;
}

// 6. Toggle Cache Killer Mode (DeclarativeNetRequest dynamic rules)
async function toggleCacheKiller(tabId, hostname) {
  const data = await chrome.storage.sync.get('settings');
  const settings = data?.settings || DEFAULT_SETTINGS;
  const list = new Set(settings.cacheKillerDomains || []);

  const ruleId = getRuleIdForHost(hostname);
  let enabled = false;

  if (list.has(hostname)) {
    // Disable
    list.delete(hostname);
    enabled = false;
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [ruleId],
    });
  } else {
    // Enable
    list.add(hostname);
    enabled = true;

    const rule = {
      id: ruleId,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          { header: 'Cache-Control', operation: 'set', value: 'no-cache, no-store, must-revalidate' },
          { header: 'Pragma', operation: 'set', value: 'no-cache' },
          { header: 'Expires', operation: 'set', value: '0' },
          { header: 'If-Modified-Since', operation: 'remove' },
          { header: 'If-None-Match', operation: 'remove' },
        ],
      },
      condition: {
        requestDomains: [hostname],
        resourceTypes: [
          'main_frame',
          'sub_frame',
          'stylesheet',
          'script',
          'image',
          'font',
          'xmlhttprequest',
          'other',
        ],
      },
    };

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [ruleId],
      addRules: [rule],
    });
  }

  settings.cacheKillerDomains = Array.from(list);
  await chrome.storage.sync.set({ settings });

  showInPageToast(
    tabId,
    enabled ? 'Cache Killer Active' : 'Cache Killer Disabled',
    `${hostname} will ${enabled ? 'bypass all caching headers' : 'use normal caching'}`
  );

  updateBadgeForTab(tabId);
  return { enabled, hostname };
}

// 7. Auto Reload Alarm Management
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('ar_tab_')) {
    const tabId = parseInt(alarm.name.replace('ar_tab_', ''), 10);
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab) {
        await chrome.tabs.reload(tabId, { bypassCache: true });
        // Reset countdown display
        if (autoReloadState.has(tabId)) {
          const entry = autoReloadState.get(tabId);
          entry.remaining = entry.interval;
          chrome.action.setBadgeText({ text: `${entry.remaining}s`, tabId });
        }
      }
    } catch (e) {
      // Tab closed
      chrome.alarms.clear(alarm.name);
      autoReloadState.delete(tabId);
    }
  } else if (alarm.name === 'ar_ticker') {
    // 1-second countdown ticker for visual badge
    for (const [tabId, entry] of autoReloadState.entries()) {
      entry.remaining = Math.max(0, entry.remaining - 1);
      chrome.action.setBadgeText({ text: `${entry.remaining}s`, tabId });
    }
  }
});

function startAutoReload(tabId, intervalSeconds) {
  const alarmName = `ar_tab_${tabId}`;
  chrome.alarms.create(alarmName, {
    periodInMinutes: intervalSeconds / 60,
    delayInMinutes: intervalSeconds / 60,
  });

  // Start ticker alarm for live badge second counter
  chrome.alarms.create('ar_ticker', { periodInMinutes: 1 / 60 });

  autoReloadState.set(tabId, {
    interval: intervalSeconds,
    remaining: intervalSeconds,
    alarmName,
  });

  chrome.action.setBadgeText({ text: `${intervalSeconds}s`, tabId });
  chrome.action.setBadgeBackgroundColor({ color: '#f59e0b', tabId });
}

function stopAutoReload(tabId) {
  const alarmName = `ar_tab_${tabId}`;
  chrome.alarms.clear(alarmName);
  autoReloadState.delete(tabId);

  if (autoReloadState.size === 0) {
    chrome.alarms.clear('ar_ticker');
  }

  updateBadgeForTab(tabId);
}

// 8. Communication API for popup / options / content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handleAsync = async () => {
    switch (message.type) {
      case 'EXECUTE_ACTION': {
        const { action, tabId, origin, url } = message;
        if (action === 'hard') return await performHardReload(tabId);
        if (action === 'cache') return await performEmptyCacheReload(tabId, origin);
        if (action === 'storage') return await performPurgeStorageReload(tabId, origin);
        if (action === 'cookies') return await performClearCookiesReload(tabId, url);
        if (action === 'nuclear') return await performNuclearPurge(tabId, origin, url);
        break;
      }

      case 'SHORTCUT_TRIGGERED': {
        const targetTab = sender?.tab || (await getActiveTab());
        if (targetTab) {
          const res = await executeCommand(message.command, targetTab);
          return res || { success: true };
        }
        return { error: 'No active tab found' };
      }

      case 'TOGGLE_CACHE_KILLER': {
        const { tabId, hostname } = message;
        return await toggleCacheKiller(tabId, hostname);
      }

      case 'GET_STATUS': {
        const { tabId, hostname, url } = message;
        const isKiller = await isCacheKillerActiveForHost(hostname);
        const autoReload = autoReloadState.get(tabId) || null;

        let cookieCount = 0;
        try {
          const cookies = await chrome.cookies.getAll({ url });
          const activeHost = hostname.toLowerCase();
          cookieCount = cookies.filter(
            (c) => c.domain.replace(/^\./, '').toLowerCase() === activeHost
          ).length;
        } catch (e) {}

        return {
          isCacheKiller: isKiller,
          autoReload,
          cookieCount,
        };
      }

      case 'SET_AUTO_RELOAD': {
        const { tabId, interval, enabled } = message;
        if (enabled && interval > 0) {
          startAutoReload(tabId, interval);
        } else {
          stopAutoReload(tabId);
        }
        return { success: true };
      }
    }
  };

  handleAsync().then(sendResponse).catch((err) => {
    sendResponse({ error: err.message });
  });

  return true; // Keep message channel open for async response
});
