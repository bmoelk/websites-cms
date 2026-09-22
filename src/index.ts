import slottdApp, {
  registerModelPack,
  syncCollectionMetadata,
  syncCollectionView,
  createDb,
  setSlottdConfig,
  type Env,
} from 'slottd';
import { config } from '../slottd.config.js';

// Initialize global runtime config with lifecycle hooks
setSlottdConfig(config);

// Auto-bootstrap / reconcile collections metadata and dynamic SQLite VIEWs on first request
let bootstrapped = false;

async function bootstrap(env: Env) {
  if (bootstrapped) return;
  const db = createDb(env.DB);

  // 1. Register Packs
  if (config.packs) {
    for (const pack of config.packs) {
      await registerModelPack(db, pack);
    }
  }

  // 2. Register Site-Specific Collections
  if (config.collections) {
    for (const [colName, colDef] of Object.entries(config.collections)) {
      await syncCollectionMetadata(db, colDef, 'site-custom', '@brainendeavor', '1.0.0');
      const fieldNames = colDef.fields.map((f) => f.name);
      await syncCollectionView(db, colName, fieldNames);
    }
  }

  bootstrapped = true;
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    ctx.waitUntil(bootstrap(env));
    return slottdApp.fetch(request, env, ctx);
  },

  async scheduled(event: any, env: Env, ctx: any) {
    if (slottdApp.scheduled) {
      return slottdApp.scheduled(event, env, ctx);
    }
  },
};
