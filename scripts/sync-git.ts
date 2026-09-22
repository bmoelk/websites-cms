import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

function parseDotEnv(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      result[key] = val;
    }
  }
  return result;
}

/**
 * CLI Git Backup & Hydration Tool for brainendeavor-slottd-cms
 * Usage:
 *   npx tsx scripts/sync-git.ts --export
 *   npx tsx scripts/sync-git.ts --export --tag=release-2026.08.31-2200
 *   npx tsx scripts/sync-git.ts --hydrate --tag=release-2026.08.31-2200
 */
async function runGitSync() {
  const isExport = process.argv.includes('--export') || !process.argv.includes('--hydrate');
  const isRemote = process.argv.includes('--remote');
  const envFlag = isRemote ? '--remote' : '--local';

  const tagArg = process.argv.find((a) => a.startsWith('--tag='));
  const targetTag = tagArg ? tagArg.split('=')[1] : null;

  const contentDirArg = process.argv.find((a) => a.startsWith('--content-dir='));
  const customContentDir = contentDirArg ? contentDirArg.split('=')[1] : null;

  const siteArg = process.argv.find((a) => a.startsWith('--site='));
  const targetSite = siteArg ? siteArg.split('=')[1] : (process.env.SLOTTD_SITE || 'brainendeavor.com');

  const devVars = parseDotEnv(path.join(process.cwd(), '.dev.vars'));
  const defaultNeutralRepo = `/Users/bmo/code/websites-git-repos/${targetSite}`;
  const targetRepoDir = siteArg
    ? defaultNeutralRepo
    : (process.env.REPO_PATH || devVars.REPO_PATH || defaultNeutralRepo);
  const contentDir = customContentDir 
    ? path.resolve(customContentDir) 
    : (siteArg ? defaultNeutralRepo : (process.env.CONTENT_DIR || devVars.CONTENT_DIR || targetRepoDir));

  if (isExport) {
    console.log(`🚀 Exporting SlottD D1 database (${envFlag}, site: ${targetSite}) to Git content directory: ${contentDir}...`);

    // 1. Fetch all documents from local or remote D1
    const exportJson = execSync(
      `npx wrangler d1 execute DB ${envFlag} --command="SELECT id, collection, slug, title, status, schema_version, publish_at, data, created_at, updated_at FROM documents WHERE site_id = '${targetSite}'" --json`,
      { encoding: 'utf8' }
    );

    let rows: any[] = [];
    try {
      const parsed = JSON.parse(exportJson);
      rows = parsed[0]?.results || [];
    } catch (e: any) {
      console.error('Failed to parse D1 output:', e.message);
      return;
    }

    if (rows.length === 0) {
      console.log('⚠️ No documents found in database to export.');
      return;
    }

    // 2. Clean collection directories safely (never delete .git or repo root metadata)
    if (fs.existsSync(contentDir)) {
      const existingEntries = fs.readdirSync(contentDir);
      for (const entry of existingEntries) {
        if (entry.startsWith('.') || entry === 'node_modules' || entry === 'package.json' || entry === 'README.md' || entry === '.gitignore') {
          continue;
        }
        const fullEntryPath = path.join(contentDir, entry);
        if (fs.statSync(fullEntryPath).isDirectory()) {
          fs.rmSync(fullEntryPath, { recursive: true, force: true });
        }
      }
    } else {
      fs.mkdirSync(contentDir, { recursive: true });
    }

    // 3. Write out structured .json and narrative .md files
    let exportedCount = 0;
    for (const row of rows) {
      const dir = path.join(contentDir, row.collection);
      fs.mkdirSync(dir, { recursive: true });

      let customData = {};
      try {
        customData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      } catch {}

      const dataCopy = { ...customData } as any;

      // Extract markdown narrative if present
      if (dataCopy.content && typeof dataCopy.content === 'string') {
        const mdPath = path.join(dir, `${row.slug}.md`);
        fs.writeFileSync(mdPath, dataCopy.content.trim() + '\n', 'utf8');
        delete dataCopy.content;
      }

      const meta = {
        id: row.id,
        collection: row.collection,
        slug: row.slug,
        title: row.title,
        status: row.status,
        schema_version: row.schema_version,
        publish_at: row.publish_at === 'null' || row.publish_at === undefined ? null : row.publish_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        data: dataCopy,
      };

      const jsonPath = path.join(dir, `${row.slug}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(meta, null, 2) + '\n', 'utf8');
      exportedCount++;
    }

    console.log(`✅ Successfully exported ${exportedCount} documents to ${contentDir}`);

    const isPush = process.argv.includes('--push');
    const releaseTag = targetTag || (isPush ? `release-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}` : null);

    // If tag requested or push requested, commit, tag, and push
    if (releaseTag) {
      console.log(`🏷️ Creating Git commit & tag '${releaseTag}' in ${targetRepoDir}...`);
      try {
        execSync(`git -C "${targetRepoDir}" add -A`, { stdio: 'inherit' });
        execSync(`git -C "${targetRepoDir}" commit -m "SlottD Content Snapshot: ${releaseTag}" || true`, { stdio: 'inherit' });
        execSync(`git -C "${targetRepoDir}" tag -a "${releaseTag}" -m "SlottD Release ${releaseTag}" || true`, { stdio: 'inherit' });
        console.log(`✅ Tag '${releaseTag}' created successfully.`);

        if (isPush) {
          console.log(`🚀 Pushing commit and tag '${releaseTag}' to Git remote (origin)...`);
          try {
            execSync(`git -C "${targetRepoDir}" push origin HEAD && git -C "${targetRepoDir}" push origin "${releaseTag}"`, { stdio: 'inherit' });
            console.log(`✅ Successfully pushed commit & tag to Git remote!`);
          } catch (pushErr: any) {
            console.warn(`⚠️ Git push notice: ${pushErr.message}`);
          }
        }
      } catch (e: any) {
        console.warn('Git commit/tag notice:', e.message);
      }
    }
  } else {
    // HYDRATE Mode: Read collections directory and populate D1
    console.log(`📥 Hydrating SlottD D1 database (${envFlag}) from Git content directory: ${contentDir}...`);

    if (!fs.existsSync(contentDir)) {
      console.error(`❌ Content directory '${contentDir}' does not exist.`);
      return;
    }

    const collections = fs.readdirSync(contentDir).filter((f) => {
      if (f.startsWith('.') || f === 'node_modules') return false;
      return fs.statSync(path.join(contentDir, f)).isDirectory();
    });
    const sqlStatements: string[] = [];
    let hydratedCount = 0;

    for (const col of collections) {
      const colDir = path.join(contentDir, col);
      const jsonFiles = fs.readdirSync(colDir).filter((f) => f.endsWith('.json'));

      for (const jsonFile of jsonFiles) {
        const fullJsonPath = path.join(colDir, jsonFile);
        const rawJson = fs.readFileSync(fullJsonPath, 'utf8');
        let doc: any = {};
        try {
          doc = JSON.parse(rawJson);
        } catch (e: any) {
          console.warn(`Failed to parse ${jsonFile}: ${e.message}`);
          continue;
        }

        const slug = doc.slug || jsonFile.replace('.json', '');
        const companionMdPath = path.join(colDir, `${slug}.md`);
        const customData = doc.data || {};

        if (fs.existsSync(companionMdPath)) {
          customData.content = fs.readFileSync(companionMdPath, 'utf8');
        }

        const safeDataJson = JSON.stringify(customData).replace(/'/g, "''");
        const safeTitle = (doc.title || slug).replace(/'/g, "''");
        const safeSlug = slug.replace(/'/g, "''");
        const safeStatus = (doc.status || 'published').replace(/'/g, "''");
        const docId = doc.id || `doc-${col}-${slug}`;
        const createdAt = doc.created_at || doc.createdAt || Date.now();
        const updatedAt = doc.updated_at || doc.updatedAt || Date.now();

        sqlStatements.push(`DELETE FROM documents WHERE site_id = '${targetSite}' AND (id = '${docId}' OR (collection = '${col}' AND slug = '${safeSlug}'));`);
        sqlStatements.push(`
          INSERT INTO documents (id, site_id, collection, slug, title, status, schema_version, data, created_at, updated_at)
          VALUES ('${docId}', '${targetSite}', '${col}', '${safeSlug}', '${safeTitle}', '${safeStatus}', 1, '${safeDataJson}', ${createdAt}, ${updatedAt});
        `);
        hydratedCount++;
      }
    }

    if (sqlStatements.length === 0) {
      console.log('⚠️ No documents found in content/ to hydrate.');
      return;
    }

    const tempSqlFile = path.join(os.tmpdir(), `slottd-hydrate-${Date.now()}.sql`);
    fs.writeFileSync(tempSqlFile, sqlStatements.join('\n'), 'utf8');

    try {
      execSync(`npx wrangler d1 execute DB ${envFlag} --file="${tempSqlFile}"`, {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      console.log(`\n🎉 Successfully hydrated ${hydratedCount} documents into SlottD D1 (${envFlag})!`);
    } catch (err: any) {
      console.error(`\n❌ Hydration failed:`, err.message);
    } finally {
      if (fs.existsSync(tempSqlFile)) {
        fs.unlinkSync(tempSqlFile);
      }
    }
  }
}

runGitSync();
