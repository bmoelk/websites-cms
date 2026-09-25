import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Seed script for SpectraGQL 4-Stage Code & Architecture Showcases
 * Targets local Miniflare D1 SQLite database in websites-cms using native node:sqlite
 */

const stages = [
  {
    id: 'showcase_spectragql_client',
    site_id: 'spectragql.dev',
    collection: 'code_showcases',
    slug: 'client',
    title: 'Client Mutation Ingestion',
    tabName: '1. Client Request',
    badgeText: 'STAGE 1 • POST /graphql',
    description: 'The client dispatches standard GraphQL over HTTP/2. SpectraGQL breaks down the request into its constituent protocol components without executing heavyweight ORM layers:',
    codeTitle: 'GraphQL Mutation Request',
    language: 'graphql',
    code: `mutation MovedAddress($userId: ID!, $street: String!, $city: String!) {
  updateAddress(userId: $userId, street: $street, city: $city) {
    receiptId
    status
    timestamp
  }
}`,
    callouts: JSON.stringify([
      {
        title: 'Authorization & Claims',
        desc: 'Cryptographically verified via bounded L1 cache; claims injected into trace headers.',
        color: 'sky',
      },
      {
        title: 'AST Selection Set',
        desc: 'Identifies the mutation field updateAddress and receipt return shape: { receiptId, status, timestamp }.',
        color: 'rose',
      },
      {
        title: 'Variables Payload',
        desc: 'Parsed once by protocol decoder and preserved as a borrowed byte slice for zero-allocation broker dispatch.',
        color: 'purple',
      },
    ]),
    order: 10,
  },
  {
    id: 'showcase_spectragql_gateway',
    site_id: 'spectragql.dev',
    collection: 'code_showcases',
    slug: 'gateway',
    title: 'Pingora Edge AST Classifier',
    tabName: '2. Pingora Gateway',
    badgeText: 'STAGE 2 • Cloudflare Pingora Proxy',
    description: 'Every microsecond matters. Built on Cloudflare Pingora, the request/dispatch hot path enforces strict invariants to deliver line-rate wire throughput:',
    codeTitle: 'Rust Edge Classifier Logic (Pingora)',
    language: 'rust',
    code: `// Zero-alloc operation classification in handle_mode_b_edge
match ast_operation_type {
    OperationType::Query => {
        // Mode A: Forward upstream to GraphQL read-model service
        self.proxy_upstream_query(session, ctx).await
    }
    OperationType::Mutation => {
        // Mode B: Monotonic receipt + async append to event sink
        let receipt_id = uuid::Uuid::now_v7();
        let hlc_stamp = ctx.hlc_clock.now();
        
        // 1. Dispatch into append-only broker
        self.dispatch_event_sink(receipt_id, hlc_stamp, raw_body).await?;
        
        // 2. Immediate <1ms HTTP 200 ACCEPTED return to client
        self.respond_command_receipt(session, receipt_id, hlc_stamp)
    }
}`,
    callouts: JSON.stringify([
      {
        title: 'SyncUpstream or AsyncCommand Routing',
        desc: 'Read queries are proxied upstream. Write mutations route via SyncUpstream (proxied to service while tapping event) or AsyncCommand (immediate <1ms edge receipt).',
        color: 'emerald',
      },
      {
        title: 'Monotonic UUIDv7 + HLC Allocation',
        desc: 'Synthesizes time-ordered, globally unique Command IDs without acquiring blocking global mutexes.',
        color: 'sky',
      },
      {
        title: 'Dual-Path CQRS Split',
        desc: 'Concurrently coordinates the client response and the asynchronous broker publish stream.',
        color: 'purple',
      },
    ]),
    order: 20,
  },
  {
    id: 'showcase_spectragql_receipt',
    site_id: 'spectragql.dev',
    collection: 'code_showcases',
    slug: 'receipt',
    title: 'Routing Modes & Progressive CQRS',
    tabName: '3. Routing Modes',
    badgeText: 'STAGE 3 • Progressive CQRS Migration',
    description: 'SpectraGQL bridges legacy architectures and streaming CQRS without downtime. Configure routing modes per-mutation directly in spectra.toml:',
    codeTitle: 'Route Configuration (spectra.toml)',
    language: 'toml',
    code: `# Configure routing mode per mutation for gradual migration
[routes.mutations.updateAddress]
# 1. SyncUpstream: Proxies to existing service while tapping broker event
# 2. AsyncCommand: Edge write termination with <1ms UUIDv7 receipt
mode = "SyncUpstream"   
sink = "nats-jetstream"
upstream = "existing_service"

# When downstream CQRS projections are verified in production,
# switch seamlessly to AsyncCommand without changing client queries:
# mode = "AsyncCommand"`,
    callouts: JSON.stringify([
      {
        title: 'SyncUpstream (Drop-In Proxy Mode)',
        badge: 'Legacy Bridge',
        desc: 'Proxies mutation upstream to your existing database, captures DB response, and simultaneously broadcasts the event to your broker.',
        color: 'blue',
      },
      {
        title: 'AsyncCommand (Pure Wire-Speed)',
        badge: '< 1ms Receipt',
        desc: 'Terminates mutation at the edge. Returns HTTP 200 ACCEPTED with monotonic UUIDv7 in <1ms. Decouples writes completely from database latency and lock contention.',
        color: 'emerald',
      },
    ]),
    order: 30,
  },
  {
    id: 'showcase_spectragql_broker',
    site_id: 'spectragql.dev',
    collection: 'code_showcases',
    slug: 'broker',
    title: 'Appended Broker Event',
    tabName: '4. Broker Log',
    badgeText: 'STAGE 4 • CloudEvents v1.0 Spec',
    description: 'Asynchronously, SpectraGQL wraps the parsed mutation into an immutable, CNCF CloudEvents envelope and pushes it into the configured event sink:',
    codeTitle: 'Dispatched CloudEvent Payload',
    language: 'json',
    code: `{
  "specversion": "1.0",
  "id": "018f3a9e-8c4d-7b2a-9f12-4c9f12345678",
  "type": "domain.user.moved_address",
  "source": "/edge/spectragql-us-east",
  "time": "2026-09-22T04:12:00.000000Z",
  "datacontenttype": "application/json",
  "data": {
    "userId": "usr_99",
    "street": "742 Evergreen Terrace",
    "city": "Springfield"
  }
}`,
    callouts: JSON.stringify([
      {
        title: 'Multi-Broker Sink Independence',
        desc: 'Streams natively into NATS JetStream, Apache Kafka, Apache Iggy, or Valkey Streams.',
        color: 'neutral',
      },
      {
        title: 'Bring-Your-Own-Worker (BYOW)',
        desc: 'Downstream micro-workers consume events using standard broker clients without proprietary SDKs.',
        color: 'neutral',
      },
    ]),
    order: 40,
  },
];

function findD1Sqlite(): string {
  const baseDir = path.resolve(__dirname, '../.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
  if (!fs.existsSync(baseDir)) {
    throw new Error(`D1 directory not found: ${baseDir}`);
  }
  const files = fs.readdirSync(baseDir).filter(f => f.endsWith('.sqlite'));
  if (!files.length) {
    throw new Error('No .sqlite file found in miniflare D1 directory.');
  }
  return path.join(baseDir, files[0]);
}

function runSeed() {
  const dbPath = findD1Sqlite();
  console.log(`Connecting to local D1: ${dbPath}`);
  const db = new DatabaseSync(dbPath);

  const now = Date.now();

  // 1. Delete legacy unmapped records for spectragql.dev
  const del = db.prepare(`
    DELETE FROM documents 
    WHERE site_id = 'spectragql.dev' 
      AND collection = 'code_showcases' 
      AND slug IN ('graphql-mutation', 'edge-receipt', 'cloudevent-stream')
  `);
  const delResult = del.run() as any;
  console.log(`Cleaned up ${delResult.changes} legacy showcase record(s).`);

  // 2. Insert or update the 4 canonical stages
  const upsert = db.prepare(`
    INSERT INTO documents (
      id, site_id, collection, slug, title, status, schema_version,
      data, draft_status, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, 'published', 1,
      ?, 'none', ?, ?
    )
    ON CONFLICT(site_id, collection, slug) DO UPDATE SET
      title = excluded.title,
      data = excluded.data,
      status = 'published',
      updated_at = excluded.updated_at
  `);

  for (const stage of stages) {
    const dataPayload = JSON.stringify({
      title: stage.title,
      slug: stage.slug,
      tabName: stage.tabName,
      badgeText: stage.badgeText,
      description: stage.description,
      codeTitle: stage.codeTitle,
      language: stage.language,
      code: stage.code,
      callouts: stage.callouts,
      order: stage.order,
    });

    upsert.run(
      stage.id,
      stage.site_id,
      stage.collection,
      stage.slug,
      stage.title,
      dataPayload,
      now,
      now
    );
    console.log(`✅ Seeded stage '${stage.slug}' (${stage.title})`);
  }

  console.log('🎉 Successfully seeded 4-stage pipeline for spectragql.dev!');
}

runSeed();
