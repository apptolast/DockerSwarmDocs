import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

// Custom frontmatter fields for the RAG-ingestion contract shared with
// apptolast/sistema-central-admin-servidor (docs/_template.md) and consumed
// by apptolast/DockerSwarmMemoria. Every factual page under
// src/content/docs/ (the 7 migrated docs) populates all of these; they are
// declared `.optional()` here only so that non-catalog pages (e.g. the
// site's src/content/docs/index.md splash homepage) don't need to fake
// values for fields that don't apply to them.
//
// `type` and `status` enums are taken verbatim from that template's comments
// (fetched 2026-07-30):
//   type:   service | runbook | infrastructure | adr | host | network | policy | architecture
//   status: stable | beta | deprecated | superseded
export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        type: z
          .enum([
            'service',
            'runbook',
            'infrastructure',
            'adr',
            'host',
            'network',
            'policy',
            'architecture',
          ])
          .optional(),
        owner: z.string().optional(),
        'source-of-truth': z.string().optional(),
        'last-verified': z.date().optional(),
        tags: z.array(z.string()).optional(),
        status: z.enum(['stable', 'beta', 'deprecated', 'superseded']).optional(),
        'superseded-by': z.string().nullable().optional(),
        'depends-on': z.array(z.string()).optional(),
        'used-by': z.array(z.string()).optional(),
        'related-runbooks': z.array(z.string()).optional(),
        'related-dashboards': z.array(z.string()).optional(),
        'related-alerts': z.array(z.string()).optional(),
        'see-also': z.array(z.string()).optional(),
      }),
    }),
  }),
};
