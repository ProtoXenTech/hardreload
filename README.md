# HardReload+ (`hard-reload-plus`)

> **Visible Name**: HardReload+  
> **Slug & Codebase**: `hard-reload-plus`  
> **Category**: Tool  
> **Target**: Chrome / Chromium-based Extension (Manifest V3)  
> **Local Testbench & Showcase**: [https://hardreload.ddev.site](https://hardreload.ddev.site)  
> **Branch**: `dev`

---

## Overview

**HardReload+** is an advanced, tactile Chrome extension designed for web developers, QA engineers, and power users. Unlike Chrome's default hard reload (which requires DevTools to be docked and open), HardReload+ allows one-click and global shortcut triggering of byte-level cache bypassing, deep storage purging, service worker unregistration, and dynamic header overrides.

---

## Key Features

1. **Precision Hard Reload (`Alt+Shift+R`)**:
   - Triggers `chrome.tabs.reload(tabId, { bypassCache: true })` to force network revalidation across all sub-resources and iframes.
2. **Empty Cache & Hard Reload (`Alt+Shift+C`)**:
   - Purges Chrome's HTTP memory and disk cache partitions scoped strictly to the active origin using `chrome.browsingData.remove`.
3. **Purge Storage & Reload (`Alt+Shift+D`)**:
   - Surgically clears `window.localStorage`, `window.sessionStorage`, deletes IndexedDB databases, and unregisters active Service Workers.
4. **Clear Domain Cookies**:
   - Granularly removes session and persistent cookies matching the active domain.
5. **Nuclear Purge**:
   - All-in-one reset: cache + client storage + cookies + service workers followed by cache-bypassed reload.
6. **Cache Killer Mode (`Alt+Shift+K`)**:
   - Uses Manifest V3 `chrome.declarativeNetRequest` dynamic rules to strip conditional validation headers (`If-Modified-Since`, `If-None-Match`) and inject `Cache-Control: no-cache, no-store, must-revalidate` on all requests for the target host.
7. **Automated Tab Reload Loop**:
   - Chrome Alarm-backed timer loop with live countdown badge counter on the toolbar icon (e.g. 5s, 10s, 30s, 60s, custom).
8. **Interactive Diagnostic Testbench**:
   - Hosted locally at `https://hardreload.ddev.site`, providing real-time storage inspectors (LocalStorage, SessionStorage, IndexedDB, Service Worker, Cookies, HTTP Network probe) to verify extension behavior in real time.

---

## Repository Structure

```
hardreload/
├── extension/                 # Standalone Chrome Extension (Unpacked)
│   ├── manifest.json          # Chrome Manifest V3 configuration
│   ├── background.js          # Background Service Worker (Alarms, DNR, Tabs, BrowsingData)
│   ├── content.js             # Injected diagnostics & in-page toast feedback
│   ├── popup.html             # Action popup interface
│   ├── popup.css              # Dark Zinc modern aesthetic
│   ├── popup.js               # Popup interactions & messaging
│   ├── options.html           # Full options & preference management
│   ├── options.css            # Options styles
│   ├── options.js             # Settings persistence
│   └── assets/                # Extension icons (16px, 32px, 48px, 128px)
├── src/                       # Showcase & Test Lab Web Application
│   ├── main.js                # Live storage testbench controller
│   └── style.css              # Tailwind CSS styling
├── public/                    # Static assets & test service worker
│   ├── sw-test.js             # Test service worker for lab
│   ├── icons/                 # High-resolution web assets
│   └── downloads/             # Pre-packaged extension .zip
├── scripts/
│   ├── generate-icons.py      # Pixel-perfect icon generator
│   └── package-extension.js   # Automated Manifest V3 packaging script
├── tests/
│   └── extension.test.js      # Automated unit test suite
├── package.json               # Project manifest (slug: hard-reload-plus)
├── vite.config.js             # Vite configuration (host: 0.0.0.0, port 3000)
└── README.md
```

---

## How to Install Unpacked in Chrome

1. Open Chrome and navigate to `chrome://extensions`.
2. Toggle **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the directory:
   ```
   /home/sajol/Server/Tool/hardreload/extension
   ```
5. Alternatively, download the pre-built `hard-reload-plus.zip` from `https://hardreload.ddev.site/downloads/hard-reload-plus.zip` and load the extracted folder.

---

## Development & Testing Commands

```bash
# Start local dev server (port 3000 -> https://hardreload.ddev.site)
pnpm dev

# Run unit test suite
pnpm test

# Package Chrome extension into public/downloads/hard-reload-plus.zip
pnpm build:extension

# Full production build
pnpm build
```

---

## Branch Governance
- `dev` — Active development branch (all changes committed here)
- `main` — Production release checkpoint
