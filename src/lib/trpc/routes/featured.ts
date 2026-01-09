import { z } from 'zod';
import { router, publicProcedure } from '@/lib/trpc/trpc';
import { adminProcedure } from '@/lib/trpc/admin';
import { db } from '@/db';
import { featuredRepos } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export const featuredRouter = router({
  // Public route to get active featured repos
  getActive: publicProcedure
    .query(async () => {
      return await db.query.featuredRepos.findMany({
        where: eq(featuredRepos.isActive, true),
        orderBy: asc(featuredRepos.position),
        limit: 10
      });
    }),

  // Admin-only routes for managing featured repos
  create: adminProcedure
    .input(z.object({
      repositoryUrl: z.string().url(),
      repositoryName: z.string().min(1),
      sponsorName: z.string().min(1),
      bidAmount: z.number().positive(), // in cents
      position: z.number().int().min(1).max(10),
    }))
    .mutation(async ({ input }) => {
      const result = await db.insert(featuredRepos).values({
        repositoryUrl: input.repositoryUrl,
        repositoryName: input.repositoryName,
        sponsorName: input.sponsorName,
        bidAmount: input.bidAmount,
        position: input.position,
        isActive: true,
      }).returning();

      return result[0];
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      repositoryUrl: z.string().url().optional(),
      repositoryName: z.string().min(1).optional(),
      sponsorName: z.string().min(1).optional(),
      bidAmount: z.number().positive().optional(),
      position: z.number().int().min(1).max(10).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      const result = await db.update(featuredRepos)
        .set(updateData)
        .where(eq(featuredRepos.id, id))
        .returning();

      return result[0];
    }),

  delete: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      await db.delete(featuredRepos)
        .where(eq(featuredRepos.id, input.id));

      return { success: true };
    }),

  getAll: adminProcedure
    .query(async () => {
      return await db.query.featuredRepos.findMany({
        orderBy: asc(featuredRepos.position)
      });
    }),
}); 