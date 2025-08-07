import { db } from '../db';
import { dailyGoalsTable, usersTable } from '../db/schema';
import { type CreateDailyGoalsInput, type DailyGoals } from '../schema';
import { eq } from 'drizzle-orm';

export const createDailyGoals = async (input: CreateDailyGoalsInput): Promise<DailyGoals> => {
  try {
    // First, verify that the user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Insert daily goals record
    const result = await db.insert(dailyGoalsTable)
      .values({
        user_id: input.user_id,
        daily_calories: input.daily_calories.toString(), // Convert number to string for numeric column
        daily_protein: input.daily_protein.toString(),
        daily_carbs: input.daily_carbs.toString(),
        daily_fats: input.daily_fats.toString(),
        daily_fluid: input.daily_fluid.toString()
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const dailyGoals = result[0];
    return {
      ...dailyGoals,
      daily_calories: parseFloat(dailyGoals.daily_calories),
      daily_protein: parseFloat(dailyGoals.daily_protein),
      daily_carbs: parseFloat(dailyGoals.daily_carbs),
      daily_fats: parseFloat(dailyGoals.daily_fats),
      daily_fluid: parseFloat(dailyGoals.daily_fluid)
    };
  } catch (error) {
    console.error('Daily goals creation failed:', error);
    throw error;
  }
};