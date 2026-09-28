import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { slotwirePack, blogPack } from 'slottd';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findD1Sqlite(): string {
  const baseDir = path.resolve(__dirname, '../.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
  if (!fs.existsSync(baseDir)) {
    throw new Error(`D1 directory not found: ${baseDir}`);
  }
  const files = fs.readdirSync(baseDir).filter((f) => f.endsWith('.sqlite'));
  if (!files.length) {
    throw new Error('No .sqlite file found in miniflare D1 directory.');
  }
  return path.join(baseDir, files[0]);
}

function syncView(db: DatabaseSync, collection: string, fields: Array<{ name: string }>) {
  const standardFields = [
    'id',
    'site_id',
    'collection',
    'slug',
    'title',
    'status',
    'schema_version',
    'publish_at',
    'created_at',
    'updated_at',
  ];
  const customFieldProjections = fields
    .map((f) => f.name)
    .filter((f) => !standardFields.includes(f))
    .map((field) => `json_extract(data, '$.${field}') AS "${field}"`);

  const selectColumns = [
    'id',
    'site_id',
    'collection',
    'slug',
    'title',
    'status',
    'schema_version',
    'publish_at',
    ...customFieldProjections,
    'created_at',
    'updated_at',
  ].join(',\n    ');

  db.exec(`DROP VIEW IF EXISTS "${collection}"`);
  db.exec(`
    CREATE VIEW "${collection}" AS
    SELECT 
      ${selectColumns}
    FROM documents
    WHERE collection = '${collection}'
  `);
  console.log(`✅ Synced dynamic SQLite view: ${collection}`);
}

async function run() {
  const dbPath = findD1Sqlite();
  console.log(`Connecting to local D1: ${dbPath}`);
  const db = new DatabaseSync(dbPath);
  const now = Date.now();

  // 1. Sync collections metadata and views
  console.log('🔄 Updating collections metadata & SQLite views...');

  // Update pages collection
  const pagesDef = slotwirePack.collections.pages;
  db.prepare(`
    UPDATE collections 
    SET schema = ?, updated_at = ?
    WHERE name = 'pages'
  `).run(JSON.stringify(pagesDef.fields), now);
  syncView(db, 'pages', pagesDef.fields);

  // Update authors collection
  const authorsDef = blogPack.collections.authors;
  db.prepare(`
    UPDATE collections 
    SET display_name = ?, description = ?, schema = ?, updated_at = ?
    WHERE name = 'authors'
  `).run(authorsDef.displayName, authorsDef.description || null, JSON.stringify(authorsDef.fields), now);
  syncView(db, 'authors', authorsDef.fields);

  // 2. Update pages/about document for brainendeavor.com
  console.log('📄 Updating pages/about document in D1...');
  const pageRow = db
    .prepare("SELECT id, data FROM documents WHERE site_id = 'brainendeavor.com' AND collection = 'pages' AND slug = 'about'")
    .get() as any;

  if (pageRow) {
    const pageData = typeof pageRow.data === 'string' ? JSON.parse(pageRow.data) : pageRow.data;

    // Purge deprecated founder fields
    delete pageData.founderName;
    delete pageData.founderRole;
    delete pageData.founderLocation;
    delete pageData.founderHandle;
    delete pageData.careerHighlights;

    // Set normalized authorSlug reference
    pageData.authorSlug = 'brian-moelk';
    pageData.heroImage = 'https://cms.brainendeavor.com/media/author-brian-moelk-2.jpg';

    db.prepare(`
      UPDATE documents 
      SET data = ?, updated_at = ?
      WHERE id = ?
    `).run(JSON.stringify(pageData), now, pageRow.id);

    console.log('✅ Successfully updated pages/about (purged founder keys, added authorSlug: "brian-moelk").');
  } else {
    console.warn('⚠️ pages/about document not found in D1.');
  }

  // 3. Update authors/brian-moelk document for brainendeavor.com
  console.log('✍️ Updating authors/brian-moelk document in D1...');
  const authorRow = db
    .prepare("SELECT id, data FROM documents WHERE site_id = 'brainendeavor.com' AND collection = 'authors' AND slug = 'brian-moelk'")
    .get() as any;

  const careerHighlights = [
    {
      company: 'Ginkgo Bioworks',
      role: 'Senior Software Engineer',
      desc: 'Scaling complex platform & data integrations.',
      period: '',
    },
    {
      company: 'Genalyte',
      role: 'Senior Manager & Architect',
      desc: 'Blood diagnostic devices (Maverick) & robotic edge labs (Merlin), helped achieve FDA clearance & Covid-19 EUA.',
      period: '',
    },
    {
      company: 'SHRM',
      role: 'Senior Architect',
      desc: 'Optimizing enterprise systems, bridging strategic vision with tactical implementation across operating units.',
      period: '',
    },
    {
      company: 'Demosphere International',
      role: 'Chief Technology Officer',
      desc: 'Leading technical strategy, product platform evolution, and engineering management.',
      period: '',
    },
  ];

  const extendedBio = `I am a technical executive and software engineer with a distinctive combination of technical excellence, business acumen, and accomplished managerial leadership. As a strategic thinker, I am relentlessly focused on the pragmatic application of technology to achieve overall business goals.

I believe in leading by example, authenticity in management, principle-centered decision making, speaking uncomfortable truths directly, and empowering individuals to achieve their full professional and personal potential.`;

  const shortBio = 'Founder, Systems Architect, and Full-Stack Engineer at BrainEndeavor. Currently enamored with Edge Computing, generating Rust with AI, deploying Cloudflare Workers, and embracing the chaos of Distributed Systems.';

  if (authorRow) {
    const authorData = typeof authorRow.data === 'string' ? JSON.parse(authorRow.data) : authorRow.data;

    authorData.title = 'Brian Moelk';
    authorData.name = 'Brian Moelk';
    authorData.slug = 'brian-moelk';
    authorData.role = 'Founder, Chief Architect & Technical Executive';
    authorData.location = 'San Diego, California';
    authorData.handle = 'brianmoelk';
    authorData.about = shortBio;
    authorData.bio = `${shortBio}\n\n${extendedBio}`;
    authorData.extendedBio = extendedBio;
    authorData.careerHighlights = careerHighlights;
    authorData.avatarUrl = 'https://cms.brainendeavor.com/media/author-brian-moelk-2.jpg';
    authorData.authorLink = 'https://brainendeavor.com';
    authorData.email = 'brian@brainendeavor.com';
    authorData.websiteUrl = '';
    authorData.collection = 'authors';

    db.prepare(`
      UPDATE documents 
      SET data = ?, updated_at = ?
      WHERE id = ?
    `).run(JSON.stringify(authorData), now, authorRow.id);

    console.log('✅ Successfully updated authors/brian-moelk with role, location, handle, dual-bio, and careerHighlights.');
  } else {
    console.warn('⚠️ authors/brian-moelk document not found in D1.');
  }

  console.log('🎉 SlottD local D1 migration and content update completed successfully.');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
