import { relations } from 'drizzle-orm';
import { user, tokenUsage, userSubscriptions, userApiKeys } from './schema';

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