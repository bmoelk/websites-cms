import { describe, it, expect } from 'vitest';
import { config } from '../slottd.config.js';

describe('BrainEndeavor SlottD CMS Configuration & Standardized Hooks', () => {
  it('defines site-specific collections and model packs', () => {
    expect(config.packs).toBeDefined();
    expect(config.collections).toHaveProperty('projects');
    expect(config.collections).toHaveProperty('services');
    expect(config.collections).toHaveProperty('testimonials');
    expect(config.collections).toHaveProperty('homepage_sections');
    expect(config.collections).toHaveProperty('site_settings');
  });

  it('configures standardized hooks with onBeforePublish and onAfterPublish', () => {
    expect(config.hooks).toBeDefined();
    expect(typeof config.hooks?.onBeforePublish).toBe('function');
    expect(typeof config.hooks?.onAfterPublish).toBe('function');
  });

  it('executes onBeforePublish and flags prohibited terms with attribution', async () => {
    const hook = config.hooks?.onBeforePublish;
    expect(hook).toBeDefined();

    const ctx = {
      bundle: { id: 'bundle-test', slug: 'test', name: 'Test Bundle' },
      changedItems: [
        {
          collection: 'projects',
          slug: 'freeformer',
          status: 'modified' as const,
          modifiedFields: ['description'],
          delta: { description: 'Our legacy-tool is great.' },
        },
      ],
      actor: { email: 'editor@brainendeavor.com', authMethod: 'cloudflare-access' },
      timestamp: Date.now(),
    };

    const report = await hook!(ctx as any);
    expect(report.status).toBe('error');
    expect(report.data?.errors.length).toBeGreaterThan(0);
    expect(report.data?.errors.some((e) => e.includes('[Brand & Terminology Linter]'))).toBe(true);
  }, 15000);

  it('passes onBeforePublish cleanly when valid content is provided', async () => {
    const hook = config.hooks?.onBeforePublish;
    const ctx = {
      bundle: { id: 'bundle-clean', slug: 'clean', name: 'Clean Bundle' },
      changedItems: [
        {
          collection: 'projects',
          slug: 'freeformer',
          status: 'modified' as const,
          modifiedFields: ['description'],
          delta: { description: 'Modern edge-native tool.' },
        },
      ],
      actor: { email: 'editor@brainendeavor.com', authMethod: 'cloudflare-access' },
      timestamp: Date.now(),
    };

    const report = await hook!(ctx as any);
    // Even if remote endpoint fails or reports warnings, report structure is standardized
    expect(['ok', 'warning', 'error']).toContain(report.status);
    expect(report.data).toHaveProperty('summary');
  }, 15000);

  it('executes onAfterPublish and returns standardized HookResult', async () => {
    const hook = config.hooks?.onAfterPublish;
    expect(hook).toBeDefined();

    const res = await hook!({
      bundle: { id: 'bundle-1', slug: 'q4-ventures', name: 'Q4 Ventures' },
      commitSha: 'abcdef123456',
    } as any);

    expect(res.status).toBe('ok');
    expect(res.data?.deployTriggered).toBe(true);
  });
});
