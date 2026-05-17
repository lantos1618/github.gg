import { z } from 'zod';

/**
 * Shared Zod schema for the publicGet* / getVersions tRPC procedures
 * across scorecard, ai-slop, security-review (and any future analysis route).
 *
 * Keeping this single source of truth ensures that adding e.g. a new optional
 * parameter doesn't have to be repeated three times.
 */
export const repoRefInputSchema = z.object({
  user: z.string(),
  repo: z.string(),
  ref: z.string().optional(),
  version: z.number().optional(),
});

export type RepoRefInput = z.infer<typeof repoRefInputSchema>;
