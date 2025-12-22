import { relations } from 'drizzle-orm';
import { user, tokenUsage, userSubscriptions, userApiKeys, developerEmails, githubWrapped, wrappedInvites, wrappedBadgeViews } from './schema';

// User relations
export const userRelations = relations(user, ({ many, one }) => ({
  tokenUsage: many(tokenUsage),
  userSubscriptions: one(userSubscriptions),
  userApiKeys: one(userApiKeys),
}));

// Token Usage relations
export const tokenUsageRelations = relations(tokenUsage, ({ one }) => ({
  user: one(user, {
    fields: [tokenUsage.userId],
    references: [user.id],
  }),
}));

// User Subscriptions relations
export const userSubscriptionsRelations = relations(userSubscriptions, ({ one }) => ({
  user: one(user, {
    fields: [userSubscriptions.userId],
    references: [user.id],
  }),
}));

// User API Keys relations
export const userApiKeysRelations = relations(userApiKeys, ({ one }) => ({
  user: one(user, {
    fields: [userApiKeys.userId],
    references: [user.id],
  }),
}));

// Developer Emails relations
export const developerEmailsRelations = relations(developerEmails, ({ one }) => ({
  user: one(user, {
    fields: [developerEmails.username],
    references: [user.name],
  }),
}));

export const githubWrappedRelations = relations(githubWrapped, ({ one, many }) => ({
  user: one(user, {
    fields: [githubWrapped.userId],
    references: [user.id],
  }),
  badgeViews: many(wrappedBadgeViews),
}));

export const wrappedInvitesRelations = relations(wrappedInvites, ({ one }) => ({
  inviter: one(user, {
    fields: [wrappedInvites.inviterId],
    references: [user.id],
  }),
}));

export const wrappedBadgeViewsRelations = relations(wrappedBadgeViews, ({ one }) => ({
  wrapped: one(githubWrapped, {
    fields: [wrappedBadgeViews.wrappedId],
    references: [githubWrapped.id],
  }),
})); 