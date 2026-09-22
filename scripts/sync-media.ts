import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isRemote = process.argv.includes('--remote');
const bucketName = 'brainendeavor-cms-media';
const potteryDir = path.resolve(__dirname, '../../brainendeavor.com/src/assets/images/pottery');

console.log(`\n======================================================`);
console.log(`🏺 BrainEndeavor Pottery Media Sync Engine`);
console.log(`======================================================`);
console.log(`🎯 Destination: \x1b[32m${isRemote ? 'REMOTE Cloudflare R2 + D1' : 'LOCAL R2 + D1'}\x1b[0m`);
console.log(`📦 R2 Bucket  : \x1b[36m${bucketName}\x1b[0m`);
console.log(`📁 Source Dir : \x1b[33m${potteryDir}\x1b[0m`);
console.log(`======================================================\n`);

if (!fs.existsSync(potteryDir)) {
  console.error(`❌ Source pottery directory not found: ${potteryDir}`);
  process.exit(1);
}

const files = fs.readdirSync(potteryDir).filter((f) => f.endsWith('.jpg') || f.endsWith('.png'));

for (const file of files) {
  const filePath = path.join(potteryDir, file);
  const stats = fs.statSync(filePath);
  const key = file;
  const mimeType = file.endsWith('.png') ? 'image/png' : 'image/jpeg';
  const id = `media-${key.replace(/[^a-z0-9_-]/gi, '-')}`;
  const now = Date.now();

  console.log(`⬆️  Uploading ${file} (${(stats.size / 1024).toFixed(1)} KB) to R2...`);

  // 1. Upload to Cloudflare R2
  const r2Cmd = `npx wrangler r2 object put "${bucketName}/${key}" --file="${filePath}" --content-type="${mimeType}"`;
  try {
    execSync(r2Cmd, { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
    console.log(`   ✅ R2 object '${key}' uploaded successfully.`);
  } catch (err: any) {
    console.warn(`   ⚠️  R2 upload notice for ${key}:`, err.message);
  }

  // 2. Register in SlottD D1 media index
  const envFlag = isRemote ? '--remote -c wrangler.overrides.toml' : '--local';
  const sql = `INSERT INTO media (id, key, filename, mime_type, size, created_at) VALUES ('${id}', '${key}', '${file}', '${mimeType}', ${stats.size}, ${now}) ON CONFLICT(key) DO UPDATE SET size = excluded.size;`;
  const d1Cmd = `npx wrangler d1 execute brainendeavor-slottd-db ${envFlag} --command="${sql}"`;
  try {
    execSync(d1Cmd, { stdio: 'ignore', cwd: path.resolve(__dirname, '..') });
    console.log(`   ✅ D1 media index updated for '${key}'.`);
  } catch (err: any) {
    console.warn(`   ⚠️  D1 registration notice for ${key}:`, err.message);
  }
}

console.log(`\n🎉 Pottery media synchronization complete!\n`);
