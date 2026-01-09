import { z } from 'zod';
import { router, protectedProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { publicApiKeys } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { generateApiKey } from '@/lib/api/auth';

const MAX_KEYS_PER_USER = 10;

export const apiKeysRouter = router({
  /**
   * List all API keys for the current user
   * Returns keys without the actual key value (only prefix for identification)
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const keys = await db
      .select({
        id: publicApiKeys.id,
        name: publicApiKeys.name,
        keyPrefix: publicApiKeys.keyPrefix,
        scopes: publicApiKeys.scopes,
        rateLimit: publicApiKeys.rateLimit,
        isActive: publicApiKeys.isActive,
        lastUsedAt: publicApiKeys.lastUsedAt,
        expiresAt: publicApiKeys.expiresAt,
        createdAt: publicApiKeys.createdAt,
      })
      .from(publicApiKeys)
      .where(eq(publicApiKeys.userId, ctx.user.id))
      .orderBy(desc(publicApiKeys.createdAt));

    return keys;
  }),

  /**
   * Create a new API key
   * Returns the full key value ONCE - it cannot be retrieved again
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
        scopes: z.array(z.enum(['read', 'write', 'admin'])).default(['read']),
        expiresInDays: z.number().min(1).max(365).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check key limit
      const existingKeys = await db
        .select({ id: publicApiKeys.id })
        .from(publicApiKeys)
        .where(eq(publicApiKeys.userId, ctx.user.id));

      if (existingKeys.length >= MAX_KEYS_PER_USER) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `You can only have ${MAX_KEYS_PER_USER} API keys. Please delete an existing key first.`,
        });
      }

      // Generate new key
      const { key, hash, prefix } = generateApiKey();

      // Calculate expiration if specified
      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      // Insert into database
      const [newKey] = await db
        .insert(publicApiKeys)
        .values({
          userId: ctx.user.id,
          name: input.name,
          keyHash: hash,
          keyPrefix: prefix,
          scopes: input.scopes,
          expiresAt,
        })
        .returning({
          id: publicApiKeys.id,
          name: publicApiKeys.name,
          keyPrefix: publicApiKeys.keyPrefix,
          scopes: publicApiKeys.scopes,
          createdAt: publicApiKeys.createdAt,
          expiresAt: publicApiKeys.expiresAt,
        });

      // Return the full key - this is the only time it will be shown
      return {
        ...newKey,
        key, // The actual API key - SHOW ONCE ONLY
      };
    }),

  /**
   * Update an API key (name, active status)
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await db
        .select({ id: publicApiKeys.id })
        .from(publicApiKeys)
        .where(
          and(
            eq(publicApiKeys.id, input.id),
            eq(publicApiKeys.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'API key not found',
        });
      }

      const updates: Partial<{ name: string; isActive: boolean }> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.isActive !== undefined) updates.isActive = input.isActive;

      if (Object.keys(updates).length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No fields to update',
        });
      }

      const [updated] = await db
        .update(publicApiKeys)
        .set(updates)
        .where(eq(publicApiKeys.id, input.id))
        .returning({
          id: publicApiKeys.id,
          name: publicApiKeys.name,
          isActive: publicApiKeys.isActive,
        });

      return updated;
    }),

  /**
   * Delete (revoke) an API key
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership before deleting
      const existing = await db
        .select({ id: publicApiKeys.id })
        .from(publicApiKeys)
        .where(
          and(
            eq(publicApiKeys.id, input.id),
            eq(publicApiKeys.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'API key not found',
        });
      }

      await db.delete(publicApiKeys).where(eq(publicApiKeys.id, input.id));

      return { success: true };
    }),
});
