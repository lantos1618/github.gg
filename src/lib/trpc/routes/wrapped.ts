import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '@/lib/trpc/trpc';
import { db } from '@/db';
import { githubWrapped, wrappedInvites } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { createGitHubServiceForUserOperations } from '@/lib/github';
import { GITHUB_GG_REPO } from '@/lib/types/wrapped';
import { TRPCError } from '@trpc/server';
import { nanoid } from 'nanoid';

export const wrappedRouter = router({
  exists: protectedProcedure
    .input(z.object({ year: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const year = input.year || new Date().getFullYear();
      const username = (ctx.user as { githubUsername?: string }).githubUsername;
      
      if (!username) {
        return { exists: false };
      }

      const wrapped = await db
        .select({ id: githubWrapped.id })
        .from(githubWrapped)
        .where(
          and(
            eq(githubWrapped.username, username.toLowerCase()),
            eq(githubWrapped.year, year)
          )
        )
        .limit(1);

      return { exists: wrapped.length > 0 };
    }),

  checkStar: protectedProcedure.query(async ({ ctx }) => {
    const githubService = await createGitHubServiceForUserOperations(ctx.session);
    const hasStarred = await githubService.hasStarredRepo(
      GITHUB_GG_REPO.owner,
      GITHUB_GG_REPO.repo
    );

    return {
      hasStarred,
      repoUrl: GITHUB_GG_REPO.url,
      username: (ctx.user as { githubUsername?: string }).githubUsername || ctx.user.name,
    };
  }),

  getMyWrapped: protectedProcedure
    .input(z.object({ year: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const year = input.year || new Date().getFullYear();

      const wrapped = await db
        .select()
        .from(githubWrapped)
        .where(
          and(
            eq(githubWrapped.userId, ctx.user.id),
            eq(githubWrapped.year, year)
          )
        )
        .limit(1);

      if (wrapped.length === 0) {
        return null;
      }

      return wrapped[0];
    }),

  getByUsername: publicProcedure
    .input(z.object({
      username: z.string(),
      year: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const year = input.year || new Date().getFullYear();

      const wrapped = await db
        .select()
        .from(githubWrapped)
        .where(
          and(
            eq(githubWrapped.username, input.username.toLowerCase()),
            eq(githubWrapped.year, year),
            eq(githubWrapped.isPublic, true)
          )
        )
        .orderBy(desc(githubWrapped.updatedAt))
        .limit(1);

      if (wrapped.length === 0) {
        return null;
      }

      return wrapped[0];
    }),

  getByShareCode: publicProcedure
    .input(z.object({ shareCode: z.string() }))
    .query(async ({ input }) => {
      const wrapped = await db
        .select()
        .from(githubWrapped)
        .where(eq(githubWrapped.shareCode, input.shareCode))
        .limit(1);

      if (wrapped.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Wrapped not found',
        });
      }

      return wrapped[0];
    }),

  createInvite: protectedProcedure
    .input(z.object({
      inviteeUsername: z.string().optional(),
      message: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const inviteCode = nanoid(10);
      const username = (ctx.user as { githubUsername?: string }).githubUsername || ctx.user.name || '';

      const [invite] = await db
        .insert(wrappedInvites)
        .values({
          inviterId: ctx.user.id,
          inviterUsername: username,
          inviteeUsername: input.inviteeUsername,
          inviteCode,
          message: input.message,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        })
        .returning();

      return {
        inviteCode,
        inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://github.gg'}/wrapped/invite/${inviteCode}`,
        invite,
      };
    }),

  acceptInvite: protectedProcedure
    .input(z.object({ inviteCode: z.string() }))
    .mutation(async ({ input }) => {
      const invite = await db
        .select()
        .from(wrappedInvites)
        .where(eq(wrappedInvites.inviteCode, input.inviteCode))
        .limit(1);

      if (invite.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invite not found',
        });
      }

      if (invite[0].status !== 'pending') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invite already used or expired',
        });
      }

      if (invite[0].expiresAt && invite[0].expiresAt < new Date()) {
        await db
          .update(wrappedInvites)
          .set({ status: 'expired' })
          .where(eq(wrappedInvites.id, invite[0].id));

        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invite has expired',
        });
      }

      await db
        .update(wrappedInvites)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
        })
        .where(eq(wrappedInvites.id, invite[0].id));

      return {
        success: true,
        inviterUsername: invite[0].inviterUsername,
      };
    }),

  updateVisibility: protectedProcedure
    .input(z.object({
      year: z.number(),
      isPublic: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(githubWrapped)
        .set({ isPublic: input.isPublic })
        .where(
          and(
            eq(githubWrapped.userId, ctx.user.id),
            eq(githubWrapped.year, input.year)
          )
        );

      return { success: true };
    }),

  updateBadgeTheme: protectedProcedure
    .input(z.object({
      year: z.number(),
      theme: z.enum(['dark', 'light', 'transparent']),
    }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(githubWrapped)
        .set({ badgeTheme: input.theme })
        .where(
          and(
            eq(githubWrapped.userId, ctx.user.id),
            eq(githubWrapped.year, input.year)
          )
        );

      return { success: true };
    }),
});
