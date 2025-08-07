import { serial, text, pgTable, timestamp, numeric, integer, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Daily goals table
export const dailyGoalsTable = pgTable('daily_goals', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  daily_calories: numeric('daily_calories', { precision: 8, scale: 2 }).notNull(),
  daily_protein: numeric('daily_protein', { precision: 8, scale: 2 }).notNull(),
  daily_carbs: numeric('daily_carbs', { precision: 8, scale: 2 }).notNull(),
  daily_fats: numeric('daily_fats', { precision: 8, scale: 2 }).notNull(),
  daily_fluid: numeric('daily_fluid', { precision: 8, scale: 2 }).notNull(), // in ml
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Food items table (master food database)
export const foodItemsTable = pgTable('food_items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  calories_per_100g: numeric('calories_per_100g', { precision: 8, scale: 2 }).notNull(),
  protein_per_100g: numeric('protein_per_100g', { precision: 8, scale: 2 }).notNull(),
  carbs_per_100g: numeric('carbs_per_100g', { precision: 8, scale: 2 }).notNull(),
  fats_per_100g: numeric('fats_per_100g', { precision: 8, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Food consumption logs
export const foodLogsTable = pgTable('food_logs', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  food_item_id: integer('food_item_id').notNull().references(() => foodItemsTable.id),
  portion_size: numeric('portion_size', { precision: 8, scale: 2 }).notNull(), // in grams
  consumed_at: timestamp('consumed_at').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Fluid consumption logs
export const fluidLogsTable = pgTable('fluid_logs', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  fluid_type: text('fluid_type').notNull(),
  volume: numeric('volume', { precision: 8, scale: 2 }).notNull(), // in ml
  consumed_at: timestamp('consumed_at').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Daily summary table (pre-calculated totals for performance)
export const dailySummariesTable = pgTable('daily_summaries', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  summary_date: date('summary_date').notNull(),
  total_calories: numeric('total_calories', { precision: 8, scale: 2 }).notNull(),
  total_protein: numeric('total_protein', { precision: 8, scale: 2 }).notNull(),
  total_carbs: numeric('total_carbs', { precision: 8, scale: 2 }).notNull(),
  total_fats: numeric('total_fats', { precision: 8, scale: 2 }).notNull(),
  total_fluid: numeric('total_fluid', { precision: 8, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many, one }) => ({
  dailyGoals: many(dailyGoalsTable),
  foodLogs: many(foodLogsTable),
  fluidLogs: many(fluidLogsTable),
  dailySummaries: many(dailySummariesTable),
}));

export const dailyGoalsRelations = relations(dailyGoalsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [dailyGoalsTable.user_id],
    references: [usersTable.id],
  }),
}));

export const foodItemsRelations = relations(foodItemsTable, ({ many }) => ({
  foodLogs: many(foodLogsTable),
}));

export const foodLogsRelations = relations(foodLogsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [foodLogsTable.user_id],
    references: [usersTable.id],
  }),
  foodItem: one(foodItemsTable, {
    fields: [foodLogsTable.food_item_id],
    references: [foodItemsTable.id],
  }),
}));

export const fluidLogsRelations = relations(fluidLogsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [fluidLogsTable.user_id],
    references: [usersTable.id],
  }),
}));

export const dailySummariesRelations = relations(dailySummariesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [dailySummariesTable.user_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type DailyGoals = typeof dailyGoalsTable.$inferSelect;
export type NewDailyGoals = typeof dailyGoalsTable.$inferInsert;
export type FoodItem = typeof foodItemsTable.$inferSelect;
export type NewFoodItem = typeof foodItemsTable.$inferInsert;
export type FoodLog = typeof foodLogsTable.$inferSelect;
export type NewFoodLog = typeof foodLogsTable.$inferInsert;
export type FluidLog = typeof fluidLogsTable.$inferSelect;
export type NewFluidLog = typeof fluidLogsTable.$inferInsert;
export type DailySummary = typeof dailySummariesTable.$inferSelect;
export type NewDailySummary = typeof dailySummariesTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  dailyGoals: dailyGoalsTable,
  foodItems: foodItemsTable,
  foodLogs: foodLogsTable,
  fluidLogs: fluidLogsTable,
  dailySummaries: dailySummariesTable,
};