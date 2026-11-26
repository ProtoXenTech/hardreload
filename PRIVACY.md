# Privacy Policy for HardReload+

**Last Updated:** November 2026  
**Publisher:** ProtoXen ([https://protoxen.com/](https://protoxen.com/))

HardReload+ ("the Extension") is an open, client-side developer utility engineered for precision cache clearing, storage purging, and tab reload automation. We are committed to transparency and user privacy.

---

## 1. Zero Data Collection & Storage
- **No Personal Data Collected:** HardReload+ does not collect, log, store, profile, or process any personal identification data, browsing history, form entries, or search queries.
- **No Remote Telemetry or Tracking:** The extension contains zero tracking pixels, analytics scripts (such as Google Analytics or Mixpanel), advertising SDKs, or third-party monitoring services.
- **No External Data Transmission:** No URLs, cookie contents, storage keys, or header modifications are ever sent to ProtoXen servers or any external third-party servers. All operations execute strictly locally within your browser sandbox.

---

## 2. Explanation of Permissions
Every permission requested by HardReload+ is strictly required to execute user-initiated developer actions on your local machine:

| Permission | Purpose |
| :--- | :--- |
| `browsingData` | Used solely to purge HTTP memory/disk cache, CacheStorage, and registered Service Workers strictly scoped to the active origin when you click reload actions. |
| `cookies` | Used solely to display the active domain's cookie count and remove subdomain-isolated cookies when the user explicitly triggers cookie clearing. |
| `storage` | Used solely via `chrome.storage.sync` to persist your local extension settings (e.g., active primary action, badge visibility, and Cache Killer domain list) across your signed-in browser instances. |
| `scripting` | Used solely to execute the in-page client storage wiper script to clear LocalStorage, SessionStorage, and IndexedDB on the active tab upon your request. |
| `tabs` & `activeTab` | Used solely to issue cache-bypassing reloads (`chrome.tabs.reload(tabId, { bypassCache: true })`) and read the hostname of the active tab for domain isolation. |
| `alarms` | Used solely to schedule local tab countdown timers for the Auto-Reload Loop feature. |
| `contextMenus` | Used solely to provide quick right-click actions ("Hard Reload Tab", "Empty Cache", "Purge Storage") from the browser context menu. |
| `declarativeNetRequest` | Used solely to apply local dynamic request header rules (`Cache-Control: no-cache, no-store`) when you toggle Cache Killer mode for specific domains. |
| Host Permissions (`<all_urls>`) | Required because developers test and inspect applications across arbitrary domains (localhost, staging environments, intranet, and public websites). Actions only execute when you explicitly trigger them. |

---

## 3. Data Retention and Security
Because HardReload+ does not store or transmit any user data, there is no risk of remote data breach or credential leakage. All configuration settings reside strictly within Chrome's sandboxed local/sync storage.

---

## 4. Updates & Inquiries
If our privacy practices change, this policy will be updated accordingly. For inquiries or technical audit questions, contact ProtoXen at:
- **Website:** [https://protoxen.com/](https://protoxen.com/)
- **Publisher:** ProtoXen Development Team
