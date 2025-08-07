import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Daily goals schema
export const dailyGoalsSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  daily_calories: z.number().positive(),
  daily_protein: z.number().nonnegative(), // in grams
  daily_carbs: z.number().nonnegative(), // in grams
  daily_fats: z.number().nonnegative(), // in grams
  daily_fluid: z.number().nonnegative(), // in milliliters
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type DailyGoals = z.infer<typeof dailyGoalsSchema>;

// Food item schema (master food database)
export const foodItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  calories_per_100g: z.number().nonnegative(),
  protein_per_100g: z.number().nonnegative(),
  carbs_per_100g: z.number().nonnegative(),
  fats_per_100g: z.number().nonnegative(),
  created_at: z.coerce.date()
});

export type FoodItem = z.infer<typeof foodItemSchema>;

// Food consumption log schema
export const foodLogSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  food_item_id: z.number(),
  portion_size: z.number().positive(), // in grams
  consumed_at: z.coerce.date(),
  created_at: z.coerce.date()
});

export type FoodLog = z.infer<typeof foodLogSchema>;

// Fluid consumption log schema
export const fluidLogSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  fluid_type: z.string(),
  volume: z.number().positive(), // in milliliters
  consumed_at: z.coerce.date(),
  created_at: z.coerce.date()
});

export type FluidLog = z.infer<typeof fluidLogSchema>;

// Daily summary schema (calculated values)
export const dailySummarySchema = z.object({
  id: z.number(),
  user_id: z.number(),
  summary_date: z.coerce.date(),
  total_calories: z.number().nonnegative(),
  total_protein: z.number().nonnegative(),
  total_carbs: z.number().nonnegative(),
  total_fats: z.number().nonnegative(),
  total_fluid: z.number().nonnegative(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type DailySummary = z.infer<typeof dailySummarySchema>;

// Input schemas for creating records
export const createUserInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createDailyGoalsInputSchema = z.object({
  user_id: z.number(),
  daily_calories: z.number().positive(),
  daily_protein: z.number().nonnegative(),
  daily_carbs: z.number().nonnegative(),
  daily_fats: z.number().nonnegative(),
  daily_fluid: z.number().nonnegative()
});

export type CreateDailyGoalsInput = z.infer<typeof createDailyGoalsInputSchema>;

export const updateDailyGoalsInputSchema = z.object({
  id: z.number(),
  daily_calories: z.number().positive().optional(),
  daily_protein: z.number().nonnegative().optional(),
  daily_carbs: z.number().nonnegative().optional(),
  daily_fats: z.number().nonnegative().optional(),
  daily_fluid: z.number().nonnegative().optional()
});

export type UpdateDailyGoalsInput = z.infer<typeof updateDailyGoalsInputSchema>;

export const createFoodItemInputSchema = z.object({
  name: z.string().min(1),
  calories_per_100g: z.number().nonnegative(),
  protein_per_100g: z.number().nonnegative(),
  carbs_per_100g: z.number().nonnegative(),
  fats_per_100g: z.number().nonnegative()
});

export type CreateFoodItemInput = z.infer<typeof createFoodItemInputSchema>;

export const logFoodInputSchema = z.object({
  user_id: z.number(),
  food_item_id: z.number(),
  portion_size: z.number().positive(),
  consumed_at: z.coerce.date().optional()
});

export type LogFoodInput = z.infer<typeof logFoodInputSchema>;

export const logFluidInputSchema = z.object({
  user_id: z.number(),
  fluid_type: z.string().min(1),
  volume: z.number().positive(),
  consumed_at: z.coerce.date().optional()
});

export type LogFluidInput = z.infer<typeof logFluidInputSchema>;

export const getUserDailyProgressInputSchema = z.object({
  user_id: z.number(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) // YYYY-MM-DD format
});

export type GetUserDailyProgressInput = z.infer<typeof getUserDailyProgressInputSchema>;

export const searchFoodItemsInputSchema = z.object({
  query: z.string().min(1)
});

export type SearchFoodItemsInput = z.infer<typeof searchFoodItemsInputSchema>;

// Progress response schema
export const dailyProgressSchema = z.object({
  date: z.string(),
  goals: dailyGoalsSchema.nullable(),
  summary: dailySummarySchema.nullable(),
  food_logs: z.array(foodLogSchema),
  fluid_logs: z.array(fluidLogSchema),
  progress_percentages: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fats: z.number(),
    fluid: z.number()
  })
});

export type DailyProgress = z.infer<typeof dailyProgressSchema>;