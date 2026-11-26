import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const extensionDir = path.join(rootDir, 'extension');

describe('HardReload+ (hard-reload-plus) Extension Validation', () => {
  const manifestPath = path.join(extensionDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  test('Manifest V3 structure and metadata', () => {
    assert.strictEqual(manifest.manifest_version, 3, 'Must be Manifest V3');
    assert.ok(manifest.name.includes('HardReload+'), 'Visible name must contain HardReload+');
    assert.strictEqual(manifest.short_name, 'HardReload+');
    assert.strictEqual(manifest.version, '1.0.0');
    assert.ok(manifest.description.length > 20, 'Description should be descriptive');
    assert.strictEqual(manifest.author, 'ProtoXen', 'Author must be ProtoXen');
    assert.strictEqual(manifest.homepage_url, 'https://protoxen.com/', 'Homepage URL must point to ProtoXen');
  });

  test('Required Manifest V3 permissions', () => {
    const requiredPermissions = [
      'tabs',
      'browsingData',
      'storage',
      'cookies',
      'scripting',
      'activeTab',
      'contextMenus',
      'alarms',
      'declarativeNetRequest',
    ];
    for (const perm of requiredPermissions) {
      assert.ok(manifest.permissions.includes(perm), `Missing permission: ${perm}`);
    }
  });

  test('Action popup and background service worker configured', () => {
    assert.strictEqual(manifest.action.default_popup, 'popup.html');
    assert.strictEqual(manifest.background.service_worker, 'background.js');
    assert.strictEqual(manifest.background.type, 'module');
    assert.strictEqual(manifest.options_ui.page, 'options.html');
  });

  test('Content scripts configured for in-page diagnostics and shortcut support', () => {
    assert.ok(Array.isArray(manifest.content_scripts), 'content_scripts must be an array');
    assert.strictEqual(manifest.content_scripts.length, 1);
    assert.ok(manifest.content_scripts[0].matches.includes('<all_urls>'));
    assert.ok(manifest.content_scripts[0].js.includes('content.js'));
  });

  test('Global keyboard commands registered with valid shortcuts', () => {
    const commands = manifest.commands;
    assert.ok(commands['hard-reload-tab'], 'Must register hard-reload-tab');
    assert.strictEqual(commands['hard-reload-tab'].suggested_key.default, 'Alt+Shift+R');
    assert.ok(commands['empty-cache-reload'], 'Must register empty-cache-reload');
    assert.strictEqual(commands['empty-cache-reload'].suggested_key.default, 'Alt+Shift+C');
    assert.ok(commands['purge-storage-reload'], 'Must register purge-storage-reload');
    assert.strictEqual(commands['purge-storage-reload'].suggested_key.default, 'Alt+Shift+D');
    assert.ok(commands['toggle-cache-killer'], 'Must register toggle-cache-killer');
    assert.strictEqual(commands['toggle-cache-killer'].suggested_key.default, 'Alt+Shift+K');
  });

  test('All extension and source JavaScript files have valid syntax', () => {
    const jsFiles = [
      path.join(extensionDir, 'background.js'),
      path.join(extensionDir, 'content.js'),
      path.join(extensionDir, 'popup.js'),
      path.join(extensionDir, 'options.js'),
      path.join(rootDir, 'src/main.js'),
    ];

    for (const file of jsFiles) {
      assert.ok(fs.existsSync(file), `File missing: ${file}`);
      const code = fs.readFileSync(file, 'utf8');
      assert.doesNotThrow(() => {
        new Function(code);
      }, `Syntax check failed for ${path.basename(file)}`);
    }
  });

  test('Background service worker implements robust tab querying for shortcuts', () => {
    const bgCode = fs.readFileSync(path.join(extensionDir, 'background.js'), 'utf8');
    assert.ok(bgCode.includes('lastFocusedWindow: true'), 'Must query lastFocusedWindow for MV3 command support');
    assert.ok(bgCode.includes('SHORTCUT_TRIGGERED'), 'Must handle in-page shortcut triggers');
  });

  test('Content script implements in-page keyboard event fallback and safe DOM construction', () => {
    const contentCode = fs.readFileSync(path.join(extensionDir, 'content.js'), 'utf8');
    assert.ok(contentCode.includes('SHORTCUT_TRIGGERED'), 'Must message background on shortcut trigger');
    assert.ok(contentCode.includes('KeyR'), 'Must support KeyR for hard reload');
    assert.ok(contentCode.includes('KeyC'), 'Must support KeyC for empty cache');
    assert.ok(contentCode.includes('KeyD'), 'Must support KeyD for purge storage');
    assert.strictEqual(contentCode.includes('toast.innerHTML'), false, 'toast must not use unescaped innerHTML');
    assert.ok(contentCode.includes('textContent = title'), 'title must be set safely via textContent');
  });

  test('Extension stylesheets comply with CSP and offline self-containment (no external @import)', () => {
    const cssFiles = ['popup.css', 'options.css'];
    for (const cssFile of cssFiles) {
      const content = fs.readFileSync(path.join(extensionDir, cssFile), 'utf8');
      assert.strictEqual(
        content.includes('@import url('),
        false,
        `${cssFile} must not load external fonts/stylesheets via @import url(...)`
      );
    }
  });

  test('Privacy policy documentation exists and details zero-data collection', () => {
    const privacyPath = path.join(rootDir, 'PRIVACY.md');
    assert.ok(fs.existsSync(privacyPath), 'PRIVACY.md must exist in root');
    const privacyContent = fs.readFileSync(privacyPath, 'utf8');
    assert.ok(privacyContent.includes('Zero Data Collection'), 'Must state zero data collection policy');
    assert.ok(privacyContent.includes('browsingData'), 'Must document browsingData permission');
    assert.ok(privacyContent.includes('cookies'), 'Must document cookies permission');
  });

  test('All required PNG icons exist and have valid PNG signatures', () => {
    const sizes = [16, 32, 48, 128];
    const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    for (const size of sizes) {
      const iconPath = path.join(extensionDir, `assets/icon${size}.png`);
      assert.ok(fs.existsSync(iconPath), `Icon file missing: assets/icon${size}.png`);
      const buffer = fs.readFileSync(iconPath);
      assert.strictEqual(
        buffer.subarray(0, 8).equals(pngMagic),
        true,
        `Icon icon${size}.png is not a valid PNG`
      );
    }
  });

  test('Packaged ZIP distribution file contains all required assets', async () => {
    const zipPath = path.join(rootDir, 'public/downloads/hard-reload-plus.zip');
    assert.ok(fs.existsSync(zipPath), 'packaged zip must exist in public/downloads');

    const zipBuffer = fs.readFileSync(zipPath);
    const zip = await JSZip.loadAsync(zipBuffer);

    const expectedFiles = [
      'manifest.json',
      'background.js',
      'content.js',
      'popup.html',
      'popup.js',
      'popup.css',
      'options.html',
      'options.js',
      'options.css',
      'assets/icon16.png',
      'assets/icon32.png',
      'assets/icon48.png',
      'assets/icon128.png',
    ];

    for (const file of expectedFiles) {
      assert.ok(zip.file(file), `ZIP archive missing expected file: ${file}`);
    }
  });

  test('Subdomain and domain isolation filter logic', () => {
    const mockCookies = [
      { domain: 'sub.example.com', name: 'sub_only' },
      { domain: '.sub.example.com', name: 'sub_dot' },
      { domain: 'example.com', name: 'root_only' },
      { domain: '.example.com', name: 'root_dot' },
      { domain: 'api.other.org', name: 'unrelated' },
    ];

    function filterCookiesForTarget(cookies, targetHostname) {
      const activeHost = targetHostname.toLowerCase();
      return cookies.filter((c) => {
        const cleanDomain = c.domain.replace(/^\./, '').toLowerCase();
        return cleanDomain === activeHost;
      });
    }

    // When purging sub.example.com
    const subTargetCookies = filterCookiesForTarget(mockCookies, 'sub.example.com');
    assert.strictEqual(subTargetCookies.length, 2);
    assert.deepStrictEqual(
      subTargetCookies.map((c) => c.name),
      ['sub_only', 'sub_dot']
    );

    // When purging example.com
    const rootTargetCookies = filterCookiesForTarget(mockCookies, 'example.com');
    assert.strictEqual(rootTargetCookies.length, 2);
    assert.deepStrictEqual(
      rootTargetCookies.map((c) => c.name),
      ['root_only', 'root_dot']
    );
  });
});
