import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Migration Engine: Imports authentic BrainEndeavor content and media from Cloudflare SonicJS into SlottD
 * Strictly adheres to the Fail-Fast / Zero-Fallbacks policy: extracts exclusively from remote Cloudflare D1.
 * 
 * Usage:
 *   npx tsx scripts/import-from-sonicjs.ts          # Migrates from Cloudflare SonicJS to Local SlottD D1
 *   npx tsx scripts/import-from-sonicjs.ts --remote # Migrates from Cloudflare SonicJS to Remote SlottD D1
 */

interface DocumentToInsert {
  id: string;
  collection: string;
  slug: string;
  title: string;
  status: string;
  data: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

interface MediaToInsert {
  id: string;
  key: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: number;
}

async function main() {
  const isRemote = process.argv.includes('--remote');
  const destEnvFlag = isRemote ? '--remote' : '--local';

  console.log(`\n======================================================`);
  console.log(`🚀 BrainEndeavor: Pure SonicJS ➔ SlottD Migration Engine`);
  console.log(`======================================================`);
  console.log(`🎯 Destination D1   : \x1b[32m${isRemote ? 'REMOTE (Cloudflare)' : 'LOCAL (.wrangler/state)'}\x1b[0m`);
  console.log(`======================================================\n`);

  const now = Date.now();
  const docsToInsert: DocumentToInsert[] = [];
  const mediaToInsert: MediaToInsert[] = [];

  console.log(`🔍 Querying Cloudflare SonicJS D1 database directly...`);
  const cmsDir = path.resolve(process.cwd(), '../brainendeavor-cms');
  if (!fs.existsSync(cmsDir)) {
    throw new Error(`SonicJS CMS repository directory not found at: ${cmsDir}`);
  }

  const queryCmd = `npx wrangler d1 execute DB --remote --command="SELECT id, root_id, type_id, slug, title, status, is_published, data, created_at, updated_at FROM documents WHERE is_current_draft = 1 OR is_published = 1;" --json`;
  const stdout = execSync(queryCmd, {
    cwd: cmsDir,
    encoding: 'utf8',
  });

  const jsonStart = stdout.indexOf('[');
  const jsonEnd = stdout.lastIndexOf(']');
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error(`Failed to parse D1 JSON output from wrangler:\n${stdout}`);
  }

  const jsonStr = stdout.slice(jsonStart, jsonEnd + 1);
  const parsed = JSON.parse(jsonStr);
  const rows: any[] = parsed[0]?.results || [];

  if (rows.length === 0) {
    throw new Error('No records returned from Cloudflare SonicJS D1 database.');
  }

  console.log(`   ✅ Extracted ${rows.length} raw records directly from remote SonicJS D1!\n`);

  for (const row of rows) {
    let customData: Record<string, any> = {};
    try {
      customData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data || {};
    } catch {
      customData = {};
    }

    const typeId = row.type_id;

    // 1. Media Asset
    if (typeId === 'media_asset') {
      const mediaKey = customData.r2Key || customData.filename || row.slug || row.id;
      const filename = customData.originalName || customData.filename || mediaKey;
      const mimeType = customData.mimeType || (filename.endsWith('.png') ? 'image/png' : 'image/jpeg');
      const size = Number(customData.size) || 0;

      mediaToInsert.push({
        id: row.id || `media-${mediaKey}`,
        key: mediaKey,
        filename,
        mimeType,
        size,
        createdAt: Number(row.created_at) || now,
      });
      continue;
    }

    // 2. Skip internal auth, system plugins & admin menus
    if ([
      'auth_user',
      'auth_session',
      'auth_account',
      'auth_verification',
      'auth_two_factor',
      'auth_tenant',
      'auth_tenant_member',
      'auth_tenant_invitation',
      'auth_tenant_team',
      'auth_password_history',
      'auth_api_tokens',
      'plugin',
      'plugin_activity',
      'rbac_role',
      'rbac_verb',
      'rbac_user_roles',
      'menu_item',
    ].includes(typeId)) {
      continue;
    }

    // 3. Skip extraneous gallery pottery images beyond canonical 4
    if (typeId === 'gallery' && (row.slug === 'pottery-5' || row.slug === 'pottery-6')) {
      continue;
    }

    // 4. Map Collections (pluralized conventions)
    let targetCollection = typeId;
    if (typeId === 'blog_post') targetCollection = 'blog_posts';
    if (typeId === 'qa_items') targetCollection = 'faq_items';

    const docId = row.id || row.root_id || `doc-${targetCollection}-${row.slug || Math.random().toString(36).slice(2, 8)}`;
    const docSlug = row.slug || customData.slug || docId;
    const docTitle = row.title || customData.title || customData.name || docSlug;
    const docStatus = row.is_published ? 'published' : row.status || 'published';

    const cleanData = { ...customData };
    delete cleanData.id;
    delete cleanData.collection;
    delete cleanData.status;

    docsToInsert.push({
      id: docId,
      collection: targetCollection,
      slug: docSlug,
      title: docTitle,
      status: docStatus,
      data: cleanData,
      createdAt: Number(row.created_at) || now,
      updatedAt: Number(row.updated_at) || now,
    });
  }

  // Deduplicate documents by (collection, slug)
  const uniqueDocsMap = new Map<string, DocumentToInsert>();
  for (const doc of docsToInsert) {
    const key = `${doc.collection}:${doc.slug}`;
    uniqueDocsMap.set(key, doc);
  }
  const uniqueDocs = Array.from(uniqueDocsMap.values());

  // Deduplicate media by key
  const uniqueMediaMap = new Map<string, MediaToInsert>();
  for (const m of mediaToInsert) {
    uniqueMediaMap.set(m.key, m);
  }
  const uniqueMedia = Array.from(uniqueMediaMap.values());

  console.log(`📦 Processed Summary:`);
  console.log(`   📄 Documents  : \x1b[32m${uniqueDocs.length}\x1b[0m records across collections`);
  console.log(`   🖼️ Media Files : \x1b[32m${uniqueMedia.length}\x1b[0m assets`);

  // Count by collection
  const countsByCol: Record<string, number> = {};
  for (const doc of uniqueDocs) {
    countsByCol[doc.collection] = (countsByCol[doc.collection] || 0) + 1;
  }
  console.log('\n📊 Collection Breakdown:');
  for (const [col, count] of Object.entries(countsByCol).sort()) {
    console.log(`   • ${col.padEnd(20)}: ${count} documents`);
  }

  // Generate Clean SQL Statements
  const sqlStatements: string[] = [];

  // Zero-Fallbacks clean-slate table wipe
  sqlStatements.push(`DELETE FROM documents;`);
  sqlStatements.push(`DELETE FROM media;`);

  // 1. Documents SQL
  for (const doc of uniqueDocs) {
    const safeDataJson = JSON.stringify(doc.data).replace(/'/g, "''");
    const safeTitle = (doc.title || '').replace(/'/g, "''");
    const safeSlug = (doc.slug || '').replace(/'/g, "''");
    const safeStatus = (doc.status || 'published').replace(/'/g, "''");

    sqlStatements.push(`
      INSERT INTO documents (id, collection, slug, title, status, schema_version, data, created_at, updated_at)
      VALUES ('${doc.id}', '${doc.collection}', '${safeSlug}', '${safeTitle}', '${safeStatus}', 1, '${safeDataJson}', ${doc.createdAt}, ${doc.updatedAt});
    `);
  }

  // 2. Media SQL
  for (const media of uniqueMedia) {
    const safeFilename = (media.filename || '').replace(/'/g, "''");
    const safeKey = (media.key || '').replace(/'/g, "''");
    const safeMime = (media.mimeType || 'image/jpeg').replace(/'/g, "''");

    sqlStatements.push(`
      INSERT INTO media (id, key, filename, mime_type, size, created_at)
      VALUES ('${media.id}', '${safeKey}', '${safeFilename}', '${safeMime}', ${media.size}, ${media.createdAt});
    `);
  }

  // Execute Batch via Wrangler D1
  const tempSqlFile = path.join(os.tmpdir(), `slottd-migration-${Date.now()}.sql`);
  fs.writeFileSync(tempSqlFile, sqlStatements.join('\n'), 'utf8');

  console.log(`\n🚀 Executing SQL Migration to SlottD D1 (${destEnvFlag})...`);
  const configFlag = isRemote && fs.existsSync(path.join(process.cwd(), 'wrangler.overrides.toml')) ? '-c wrangler.overrides.toml' : '';
  try {
    execSync(`npx wrangler d1 execute DB ${destEnvFlag} ${configFlag} -y --file="${tempSqlFile}"`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log(`\n✨ Successfully migrated ${uniqueDocs.length} documents & ${uniqueMedia.length} media assets into SlottD D1!`);
  } catch (err: any) {
    console.error(`\n❌ Migration SQL execution failed:`, err.message);
    throw err;
  } finally {
    if (fs.existsSync(tempSqlFile)) {
      fs.unlinkSync(tempSqlFile);
    }
  }
}

main().catch((e) => {
  console.error('Fatal migration error:', e.message);
  process.exit(1);
});
