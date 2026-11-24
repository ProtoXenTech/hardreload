import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const extensionDir = path.join(rootDir, 'extension');
const publicDir = path.join(rootDir, 'public');
const downloadsDir = path.join(publicDir, 'downloads');

async function packageExtension() {
  console.log('📦 Validating and packaging HardReload+ extension...');

  // Ensure directories exist
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }

  // Validate manifest.json
  const manifestPath = path.join(extensionDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('manifest.json not found in extension directory!');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`✅ Manifest verified: ${manifest.name} (v${manifest.version})`);

  // Verify icons
  const requiredIcons = ['assets/icon16.png', 'assets/icon32.png', 'assets/icon48.png', 'assets/icon128.png'];
  for (const icon of requiredIcons) {
    const iconPath = path.join(extensionDir, icon);
    if (!fs.existsSync(iconPath)) {
      throw new Error(`Missing required extension icon: ${icon}`);
    }
  }
  console.log('✅ Extension icons verified.');

  // Create ZIP archive
  const zip = new JSZip();

  function addFolderToZip(folderPath, zipFolder) {
    const items = fs.readdirSync(folderPath);
    for (const item of items) {
      const fullPath = path.join(folderPath, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        const subZip = zipFolder.folder(item);
        addFolderToZip(fullPath, subZip);
      } else {
        const fileContent = fs.readFileSync(fullPath);
        zipFolder.file(item, fileContent);
      }
    }
  }

  addFolderToZip(extensionDir, zip);

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  const zipPath = path.join(downloadsDir, 'hard-reload-plus.zip');
  fs.writeFileSync(zipPath, zipBuffer);

  const sizeKb = (zipBuffer.length / 1024).toFixed(1);
  console.log(`🎉 Extension packaged successfully into ${zipPath} (${sizeKb} KB)`);
}

packageExtension().catch((err) => {
  console.error('❌ Failed to package extension:', err);
  process.exit(1);
});
