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

  test('Global keyboard commands registered', () => {
    const commands = manifest.commands;
    assert.ok(commands['hard-reload-tab'], 'Must register hard-reload-tab');
    assert.ok(commands['empty-cache-reload'], 'Must register empty-cache-reload');
    assert.ok(commands['purge-storage-reload'], 'Must register purge-storage-reload');
    assert.ok(commands['toggle-cache-killer'], 'Must register toggle-cache-killer');
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
