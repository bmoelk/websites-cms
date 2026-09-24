import { 
  slotwirePack, 
  blogPack, 
  runCheckPipeline,
  slotwireContractCheck, 
  mediaIntegrityCheck,
  terminologyCheck, 
  type SlottdConfig, 
  type PublishCheck 
} from 'slottd';

// ── Pre-Publish Active Check Pipeline ─────────────────────────────────────────
const activeChecks: PublishCheck[] = [
  // Check A: SlotWire Schema Contracts (Default Active)
  slotwireContractCheck({
    endpoint: 'https://edit.brainendeavor.com/api/slotwire/validate',
  }),

  // Check B: Media Asset Integrity Scanner (Default Active)
  mediaIntegrityCheck({
    severity: 'warning',
    checkR2: true,
  }),

  // Check C: Prohibited Terminology Linter (Default Active)
  terminologyCheck({
    flaggedTerms: ['badword', 'deprecatedBrandName', 'legacy-tool'],
    severity: 'error',
  }),
];

export const config: SlottdConfig = {
  // 1. Modular Model Packs
  packs: [
    slotwirePack, // pages, page_sections, feature_cards, gallery, endorsements, qa_items, site_navigation
    blogPack,     // blog_posts, authors
  ],

  // 2. Site-Specific Collections
  collections: {
    site_settings: {
      name: 'site_settings',
      displayName: 'Site Settings',
      icon: '⚙️',
      description: 'Global site identity, branding, social links, and SEO configuration',
      schemaVersion: 1,
      fields: [
        { name: 'title', type: 'TEXT', widget: 'text', label: 'Setting Key / Title', required: true },
        { name: 'slug', type: 'TEXT', widget: 'slug', label: 'Slug', required: true },
        { name: 'siteTitle', type: 'TEXT', widget: 'text', label: 'Site Title', required: true },
        { name: 'tagline', type: 'TEXT', widget: 'text', label: 'Tagline' },
        { name: 'defaultMetaDescription', type: 'TEXT', widget: 'textarea', label: 'Default Meta Description' },
        { name: 'defaultOgImage', type: 'TEXT', widget: 'media', label: 'Default OG Image (R2)' },
        { name: 'contactEmail', type: 'TEXT', widget: 'text', label: 'Contact Email' },
        { name: 'copyrightText', type: 'TEXT', widget: 'text', label: 'Copyright Notice' },
        { name: 'githubUrl', type: 'TEXT', widget: 'text', label: 'GitHub URL' },
        { name: 'linkedinUrl', type: 'TEXT', widget: 'text', label: 'LinkedIn URL' },
      ],
    },
    homepage_sections: {
      name: 'homepage_sections',
      displayName: 'Homepage Layout Sections',
      icon: '🏠',
      description: 'Homepage specific hero, capability, and contact sections',
      schemaVersion: 1,
      fields: [
        { name: 'title', type: 'TEXT', widget: 'text', label: 'Section Title', required: true },
        { name: 'slug', type: 'TEXT', widget: 'slug', label: 'Slug', required: true },
        { name: 'badgeText', type: 'TEXT', widget: 'text', label: 'Badge Label' },
        { name: 'description', type: 'TEXT', widget: 'textarea', label: 'Description' },
        { name: 'primaryCtaText', type: 'TEXT', widget: 'text', label: 'Primary CTA Text' },
        { name: 'primaryCtaUrl', type: 'TEXT', widget: 'text', label: 'Primary CTA URL' },
        { name: 'secondaryCtaText', type: 'TEXT', widget: 'text', label: 'Secondary CTA Text' },
        { name: 'secondaryCtaUrl', type: 'TEXT', widget: 'text', label: 'Secondary CTA URL' },
        { name: 'order', type: 'INTEGER', widget: 'number', label: 'Display Order', defaultValue: 10 },
      ],
    },
    projects: {
      name: 'projects',
      displayName: 'Projects & Active Ventures',
      icon: '🚀',
      description: 'Active ventures, open-source toolchains, and experimental R&D initiatives',
      schemaVersion: 1,
      fields: [
        { name: 'title', type: 'TEXT', widget: 'text', label: 'Project Name / Title', required: true },
        { name: 'slug', type: 'TEXT', widget: 'slug', label: 'Slug', required: true },
        { name: 'category', type: 'TEXT', widget: 'select', label: 'Category', options: [
          { label: 'Venture', value: 'venture' },
          { label: 'Open Source', value: 'opensource' },
          { label: 'R&D', value: 'rnd' },
        ], required: true },
        { name: 'badgeText', type: 'TEXT', widget: 'text', label: 'Badge Label' },
        { name: 'description', type: 'TEXT', widget: 'textarea', label: 'Summary / Description', required: true },
        { name: 'destinationUrl', type: 'TEXT', widget: 'text', label: 'Live Website URL' },
        { name: 'githubUrl', type: 'TEXT', widget: 'text', label: 'GitHub Repository URL' },
        { name: 'image', type: 'TEXT', widget: 'media', label: 'Project Visual / Screenshot' },
        { name: 'order', type: 'INTEGER', widget: 'number', label: 'Display Order', defaultValue: 10 },
      ],
    },
    services: {
      name: 'services',
      displayName: 'Services & Capabilities',
      icon: '⚡',
      description: 'Engineering architecture, embedded collaboration, and AI implementation services',
      schemaVersion: 1,
      fields: [
        { name: 'title', type: 'TEXT', widget: 'text', label: 'Service Name', required: true },
        { name: 'slug', type: 'TEXT', widget: 'slug', label: 'Slug', required: true },
        { name: 'badgeText', type: 'TEXT', widget: 'text', label: 'Badge Label' },
        { name: 'description', type: 'TEXT', widget: 'textarea', label: 'Service Description', required: true },
        { name: 'icon', type: 'TEXT', widget: 'text', label: 'Icon Key' },
        { name: 'order', type: 'INTEGER', widget: 'number', label: 'Display Order', defaultValue: 10 },
      ],
    },
    testimonials: {
      name: 'testimonials',
      displayName: 'Testimonials & Reviews',
      icon: '🌟',
      description: 'Testimonials, executive quotes, and recommendations',
      schemaVersion: 1,
      fields: [
        { name: 'title', type: 'TEXT', widget: 'text', label: 'Headline / Summary' },
        { name: 'slug', type: 'TEXT', widget: 'slug', label: 'Slug' },
        { name: 'quote', type: 'TEXT', widget: 'textarea', label: 'Quote Narrative', required: true },
        { name: 'author', type: 'TEXT', widget: 'text', label: 'Author Name', required: true },
        { name: 'role', type: 'TEXT', widget: 'text', label: 'Author Title / Role' },
        { name: 'company', type: 'TEXT', widget: 'text', label: 'Company / Organization' },
        { name: 'avatar', type: 'TEXT', widget: 'media', label: 'Avatar Photo (R2)' },
        { name: 'order', type: 'INTEGER', widget: 'number', label: 'Display Order', defaultValue: 10 },
      ],
    },
    benchmarks: {
      name: 'benchmarks',
      displayName: 'Performance Benchmarks',
      icon: '📊',
      description: 'Key performance metrics, throughput, latency, and footprint indicators',
      schemaVersion: 1,
      fields: [
        { name: 'title', type: 'TEXT', widget: 'text', label: 'Benchmark Name', required: true },
        { name: 'slug', type: 'TEXT', widget: 'slug', label: 'Slug', required: true },
        { name: 'metricLabel', type: 'TEXT', widget: 'text', label: 'Metric Label', required: true },
        { name: 'metricValue', type: 'TEXT', widget: 'text', label: 'Metric Value', required: true },
        { name: 'subtext', type: 'TEXT', widget: 'textarea', label: 'Technical Context / Subtext' },
        { name: 'order', type: 'INTEGER', widget: 'number', label: 'Display Order', defaultValue: 10 },
      ],
    },
    code_showcases: {
      name: 'code_showcases',
      displayName: 'Code Showcases',
      icon: '💻',
      description: 'Interactive syntax-highlighted code tabs and architectural snippets',
      schemaVersion: 1,
      fields: [
        { name: 'title', type: 'TEXT', widget: 'text', label: 'Snippet Title', required: true },
        { name: 'slug', type: 'TEXT', widget: 'slug', label: 'Slug', required: true },
        { name: 'tabName', type: 'TEXT', widget: 'text', label: 'Tab Label', required: true },
        { name: 'language', type: 'TEXT', widget: 'text', label: 'Language (json, rust, graphql)', required: true },
        { name: 'code', type: 'TEXT', widget: 'textarea', label: 'Code Content', required: true },
        { name: 'order', type: 'INTEGER', widget: 'number', label: 'Display Order', defaultValue: 10 },
      ],
    },
    event_sinks: {
      name: 'event_sinks',
      displayName: 'Event Sinks & Adapters',
      icon: '🚰',
      description: 'Supported message brokers, event streaming platforms, and buffer tiers',
      schemaVersion: 1,
      fields: [
        { name: 'title', type: 'TEXT', widget: 'text', label: 'Sink Name', required: true },
        { name: 'slug', type: 'TEXT', widget: 'slug', label: 'Slug', required: true },
        { name: 'tier', type: 'TEXT', widget: 'text', label: 'Architecture Tier' },
        { name: 'sinkStatus', type: 'TEXT', widget: 'text', label: 'Sink Status (beta, alpha)' },
        { name: 'badgeText', type: 'TEXT', widget: 'text', label: 'Badge Label' },
        { name: 'description', type: 'TEXT', widget: 'textarea', label: 'Description', required: true },
        { name: 'icon', type: 'TEXT', widget: 'text', label: 'Icon Identifier' },
        { name: 'projectUrl', type: 'TEXT', widget: 'text', label: 'Documentation / Project URL' },
        { name: 'order', type: 'INTEGER', widget: 'number', label: 'Display Order', defaultValue: 10 },
      ],
    },
    faqs: {
      name: 'faqs',
      displayName: 'Frequently Asked Questions',
      icon: '❓',
      description: 'Categorized technical FAQs and architectural explanations',
      schemaVersion: 1,
      fields: [
        { name: 'title', type: 'TEXT', widget: 'text', label: 'Title / Reference', required: true },
        { name: 'slug', type: 'TEXT', widget: 'slug', label: 'Slug', required: true },
        { name: 'question', type: 'TEXT', widget: 'text', label: 'Question', required: true },
        { name: 'category', type: 'TEXT', widget: 'text', label: 'Category' },
        { name: 'answer', type: 'TEXT', widget: 'richtext', label: 'Answer (HTML / Markdown)', required: true },
        { name: 'order', type: 'INTEGER', widget: 'number', label: 'Display Order', defaultValue: 10 },
      ],
    },
    runtime_specs: {
      name: 'runtime_specs',
      displayName: 'Runtime Specifications',
      icon: '⚡',
      description: 'WebAssembly execution engine and container runtime specifications',
      schemaVersion: 1,
      fields: [
        { name: 'title', type: 'TEXT', widget: 'text', label: 'Spec Title', required: true },
        { name: 'slug', type: 'TEXT', widget: 'slug', label: 'Slug', required: true },
        { name: 'metricLabel', type: 'TEXT', widget: 'text', label: 'Metric Label', required: true },
        { name: 'metricValue', type: 'TEXT', widget: 'text', label: 'Metric Value', required: true },
        { name: 'subtext', type: 'TEXT', widget: 'textarea', label: 'Technical Context / Subtext' },
        { name: 'order', type: 'INTEGER', widget: 'number', label: 'Display Order', defaultValue: 10 },
      ],
    },
    storage_tiers: {
      name: 'storage_tiers',
      displayName: 'Storage Tiers',
      icon: '💾',
      description: 'CQRS state persistence and storage backends',
      schemaVersion: 1,
      fields: [
        { name: 'title', type: 'TEXT', widget: 'text', label: 'Tier Title', required: true },
        { name: 'slug', type: 'TEXT', widget: 'slug', label: 'Slug', required: true },
        { name: 'tierType', type: 'TEXT', widget: 'text', label: 'Tier Type' },
        { name: 'storageEngine', type: 'TEXT', widget: 'text', label: 'Storage Engine' },
        { name: 'badgeText', type: 'TEXT', widget: 'text', label: 'Badge Label' },
        { name: 'description', type: 'TEXT', widget: 'textarea', label: 'Description', required: true },
        { name: 'order', type: 'INTEGER', widget: 'number', label: 'Display Order', defaultValue: 10 },
      ],
    },
  },

  // 3. Git Backup Target
  git: {
    repo: 'git@github.com:bmoelk/brainendeavor.com.git',
    branch: 'main',
    path: '',
    includeDrafts: true,
  },

  // 4. Standardized Lifecycle Hooks
  hooks: {
    onBeforePublish: async (ctx) => {
      return runCheckPipeline(activeChecks, ctx);
    },
    onAfterPublish: async (ctx) => {
      console.log(
        `🚀 Release published: ${ctx.bundle?.name || 'Direct Publish'} (Commit: ${ctx.commitSha?.slice(0, 7) || 'local'})`
      );
      return {
        status: 'ok',
        message: 'Post-publish automations completed successfully',
        data: { deployTriggered: true },
      };
    },
  },
};

export default config;
