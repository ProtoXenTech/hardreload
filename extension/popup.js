/**
 * HardReload+ (hard-reload-plus)
 * Popup Controller — Precision Cache & Storage Buster
 */

document.addEventListener('DOMContentLoaded', async () => {
  let currentTab = null;
  let activeInterval = 10;
  let isAutoReloading = false;

  const domainEl = document.getElementById('tab-domain');
  const protocolBadge = document.getElementById('tab-protocol-badge');
  const cookieStatEl = document.getElementById('cookie-stat');
  const storageStatEl = document.getElementById('storage-stat');
  const cacheKillerToggle = document.getElementById('toggle-cache-killer');
  const arStatusText = document.getElementById('ar-status-text');
  const arProgressBar = document.getElementById('ar-progress-bar');
  const btnToggleAr = document.getElementById('btn-toggle-ar');
  const presetBtns = document.querySelectorAll('.ar-preset-btn');
  const toastEl = document.getElementById('popup-toast');
  const toastText = document.getElementById('toast-text');
  const btnCopyDomain = document.getElementById('btn-copy-domain');

  // Query active tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;

    if (!tab || !tab.url || tab.url.startsWith('chrome://')) {
      domainEl.textContent = 'Restricted page';
      protocolBadge.textContent = 'SYSTEM';
      protocolBadge.className = 'px-1.5 py-0.2 rounded text-[10px] font-semibold tracking-wider uppercase bg-zinc-800 text-zinc-400 border border-zinc-700';
      disableActions();
      return;
    }

    const urlObj = new URL(tab.url);
    domainEl.textContent = urlObj.hostname;

    if (urlObj.protocol === 'https:') {
      protocolBadge.textContent = 'HTTPS';
      protocolBadge.className = 'px-1.5 py-0.2 rounded text-[10px] font-semibold tracking-wider uppercase bg-emerald-950 text-emerald-400 border border-emerald-800/60';
    } else {
      protocolBadge.textContent = 'HTTP';
      protocolBadge.className = 'px-1.5 py-0.2 rounded text-[10px] font-semibold tracking-wider uppercase bg-amber-950 text-amber-400 border border-amber-800/60';
    }

    // Bind copy domain
    btnCopyDomain?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(urlObj.origin);
        showToast(`Copied ${urlObj.origin}`);
        btnCopyDomain.innerHTML = '<svg class="w-3 h-3 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
        setTimeout(() => {
          btnCopyDomain.innerHTML = '<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
        }, 1500);
      } catch (e) {}
    });

    // Fetch tab info & metrics from background & content
    refreshTabDiagnostics(tab, urlObj);

  } catch (err) {
    domainEl.textContent = 'Error loading tab';
  }

  // Refresh tab diagnostics
  async function refreshTabDiagnostics(tab, urlObj) {
    // Background stats (cookies, killer state, auto-reload)
    chrome.runtime.sendMessage(
      {
        type: 'GET_STATUS',
        tabId: tab.id,
        hostname: urlObj.hostname,
        url: tab.url,
      },
      (res) => {
        if (!res) return;
        cookieStatEl.textContent = res.cookieCount || 0;
        cacheKillerToggle.checked = !!res.isCacheKiller;

        if (res.autoReload) {
          isAutoReloading = true;
          activeInterval = res.autoReload.interval;
          const remaining = res.autoReload.remaining;
          arStatusText.textContent = `Running (${remaining}s)`;
          btnToggleAr.textContent = 'Stop';
          btnToggleAr.className = 'px-3 py-1 rounded text-xs font-medium bg-red-900 text-red-100 hover:bg-red-800 border border-red-700 transition-all';

          // Update progress bar percentage
          const percent = Math.max(0, Math.min(100, ((activeInterval - remaining) / activeInterval) * 100));
          if (arProgressBar) arProgressBar.style.width = `${percent}%`;
        } else {
          isAutoReloading = false;
          arStatusText.textContent = 'Idle';
          btnToggleAr.textContent = 'Start';
          btnToggleAr.className = 'px-3 py-1 rounded text-xs font-medium bg-zinc-800 hover:bg-indigo-600 text-zinc-200 hover:text-white border border-zinc-700/60 hover:border-indigo-500 transition-all';
          if (arProgressBar) arProgressBar.style.width = '0%';
        }

        updatePresetBtnStyles();
      }
    );

    // Injected client storage metrics
    try {
      chrome.tabs.sendMessage(tab.id, { type: 'GET_CLIENT_DIAGNOSTICS' }, (res) => {
        if (chrome.runtime.lastError || !res) {
          storageStatEl.textContent = '0';
          return;
        }
        const total = (res.localStorageCount || 0) + (res.sessionStorageCount || 0);
        storageStatEl.textContent = total;
      });
    } catch (e) {
      storageStatEl.textContent = '0';
    }
  }

  function disableActions() {
    document.querySelectorAll('.action-card, #btn-nuclear-purge, #toggle-cache-killer, #btn-toggle-ar').forEach((el) => {
      el.disabled = true;
      el.classList.add('opacity-50', 'pointer-events-none');
    });
  }

  // Toast display
  function showToast(msg) {
    toastText.textContent = msg;
    toastEl.classList.remove('hidden');
    setTimeout(() => {
      toastEl.classList.add('hidden');
    }, 2200);
  }

  // Execute Action Helper
  async function triggerAction(actionName, label) {
    if (!currentTab || !currentTab.id) return;

    const startTime = performance.now();
    const urlObj = new URL(currentTab.url);

    chrome.runtime.sendMessage(
      {
        type: 'EXECUTE_ACTION',
        action: actionName,
        tabId: currentTab.id,
        origin: urlObj.origin,
        url: currentTab.url,
      },
      (res) => {
        const elapsed = Math.round(performance.now() - startTime);
        showToast(`${label} done in ${elapsed}ms`);
        // Refresh local stats
        setTimeout(() => refreshTabDiagnostics(currentTab, urlObj), 300);
      }
    );
  }

  // Event Listeners for Actions
  document.getElementById('btn-hard-reload')?.addEventListener('click', () => {
    triggerAction('hard', 'Hard Reload');
  });

  document.getElementById('btn-empty-cache')?.addEventListener('click', () => {
    triggerAction('cache', 'Empty Cache');
  });

  document.getElementById('btn-purge-storage')?.addEventListener('click', () => {
    triggerAction('storage', 'Purge Storage');
  });

  document.getElementById('btn-clear-cookies')?.addEventListener('click', () => {
    triggerAction('cookies', 'Clear Cookies');
  });

  document.getElementById('btn-nuclear-purge')?.addEventListener('click', () => {
    triggerAction('nuclear', 'Nuclear Purge');
  });

  // Cache Killer Switch
  cacheKillerToggle?.addEventListener('change', () => {
    if (!currentTab || !currentTab.id) return;
    const urlObj = new URL(currentTab.url);

    chrome.runtime.sendMessage(
      {
        type: 'TOGGLE_CACHE_KILLER',
        tabId: currentTab.id,
        hostname: urlObj.hostname,
      },
      (res) => {
        showToast(res.enabled ? 'Cache Killer Activated' : 'Cache Killer Disabled');
      }
    );
  });

  // Auto-Reload Presets
  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeInterval = parseInt(btn.getAttribute('data-sec'), 10);
      updatePresetBtnStyles();

      if (isAutoReloading && currentTab) {
        chrome.runtime.sendMessage({
          type: 'SET_AUTO_RELOAD',
          tabId: currentTab.id,
          interval: activeInterval,
          enabled: true,
        });
        arStatusText.textContent = `Running (${activeInterval}s)`;
      }
    });
  });

  function updatePresetBtnStyles() {
    presetBtns.forEach((btn) => {
      const sec = parseInt(btn.getAttribute('data-sec'), 10);
      if (sec === activeInterval) {
        btn.classList.add('bg-indigo-600', 'text-white', 'border-indigo-500');
        btn.classList.remove('bg-zinc-800', 'text-zinc-300', 'border-zinc-700/60');
      } else {
        btn.classList.remove('bg-indigo-600', 'text-white', 'border-indigo-500');
        btn.classList.add('bg-zinc-800', 'text-zinc-300', 'border-zinc-700/60');
      }
    });
  }

  // Toggle Auto-Reload
  btnToggleAr?.addEventListener('click', () => {
    if (!currentTab || !currentTab.id) return;

    isAutoReloading = !isAutoReloading;

    chrome.runtime.sendMessage(
      {
        type: 'SET_AUTO_RELOAD',
        tabId: currentTab.id,
        interval: activeInterval,
        enabled: isAutoReloading,
      },
      () => {
        if (isAutoReloading) {
          arStatusText.textContent = `Running (${activeInterval}s)`;
          btnToggleAr.textContent = 'Stop';
          btnToggleAr.className = 'px-3 py-1 rounded text-xs font-medium bg-red-900 text-red-100 hover:bg-red-800 border border-red-700 transition-all';
          showToast(`Auto-reload: ${activeInterval}s`);
        } else {
          arStatusText.textContent = 'Idle';
          btnToggleAr.textContent = 'Start';
          btnToggleAr.className = 'px-3 py-1 rounded text-xs font-medium bg-zinc-800 hover:bg-indigo-600 text-zinc-200 hover:text-white border border-zinc-700/60 hover:border-indigo-500 transition-all';
          if (arProgressBar) arProgressBar.style.width = '0%';
          showToast('Auto-reload stopped');
        }
      }
    );
  });

  // Top header icons
  document.getElementById('btn-open-options')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('btn-open-lab')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://hardreload.ddev.site' });
  });

  document.getElementById('btn-configure-shortcuts')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });

  document.querySelectorAll('#link-protoxen, #link-protoxen-web').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://protoxen.com/' });
    });
  });
});
