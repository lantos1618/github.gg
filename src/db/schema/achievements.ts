import { pgTable, text, timestamp, uuid, uniqueIndex, integer, jsonb } from 'drizzle-orm/pg-core';
import { user } from './auth';

// Achievements
export const achievements = pgTable('achievements', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  icon: text('icon'), // Emoji or icon name
  category: text('category').notNull(), // battle, ranking, tournament, special
  criteria: jsonb('criteria').notNull(), // Achievement criteria
  rarity: text('rarity').notNull().default('common'), // common, rare, epic, legendary
  points: integer('points').notNull().default(0), // Achievement points
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// User Achievements
export const userAchievements = pgTable('user_achievements', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  achievementId: uuid('achievement_id').references(() => achievements.id, { onDelete: 'cascade' }).notNull(),
  unlockedAt: timestamp('unlocked_at').notNull().defaultNow(),
}, (table) => ({
  // Ensure unique achievement per user
  userAchievementIdx: uniqueIndex('user_achievement_idx').on(table.userId, table.achievementId),
}));
