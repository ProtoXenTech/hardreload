/**
 * HardReload+ (hard-reload-plus)
 * Content Script — In-Page Storage Diagnostics & Notifications
 */

(() => {
  // Listen for background requests
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_CLIENT_DIAGNOSTICS') {
      const stats = {
        localStorageCount: 0,
        sessionStorageCount: 0,
        hasIndexedDB: false,
        swCount: 0,
      };

      try {
        stats.localStorageCount = window.localStorage.length;
      } catch (e) {}

      try {
        stats.sessionStorageCount = window.sessionStorage.length;
      } catch (e) {}

      stats.hasIndexedDB = !!window.indexedDB;

      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          stats.swCount = regs.length;
          sendResponse(stats);
        }).catch(() => {
          sendResponse(stats);
        });
        return true; // async
      }

      sendResponse(stats);
      return false;
    }

    if (message.type === 'SHOW_PURGE_TOAST') {
      showToast(message.title, message.detail);
      sendResponse({ shown: true });
    }
  });

  function showToast(title, detail) {
    const existing = document.getElementById('hard-reload-plus-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'hard-reload-plus-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 18px;
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 10px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.5);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      color: #fafafa;
      line-height: 1.4;
      pointer-events: none;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    toast.innerHTML = `
      <div style="width: 8px; height: 8px; border-radius: 9999px; background: #10b981; flex-shrink: 0;"></div>
      <div>
        <div style="font-weight: 600; color: #ffffff;">${title}</div>
        ${detail ? `<div style="font-size: 11px; color: #a1a1aa;">${detail}</div>` : ''}
      </div>
    `;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 2200);
  }
})();
