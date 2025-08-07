import { db } from '../db';
import { dailyGoalsTable } from '../db/schema';
import { type UpdateDailyGoalsInput, type DailyGoals } from '../schema';
import { eq } from 'drizzle-orm';

export const updateDailyGoals = async (input: UpdateDailyGoalsInput): Promise<DailyGoals> => {
  try {
    // Build update object with only provided fields (excluding undefined values)
    const updateData: Record<string, string | Date> = {};
    
    if (input.daily_calories !== undefined) {
      updateData['daily_calories'] = input.daily_calories.toString();
    }
    if (input.daily_protein !== undefined) {
      updateData['daily_protein'] = input.daily_protein.toString();
    }
    if (input.daily_carbs !== undefined) {
      updateData['daily_carbs'] = input.daily_carbs.toString();
    }
    if (input.daily_fats !== undefined) {
      updateData['daily_fats'] = input.daily_fats.toString();
    }
    if (input.daily_fluid !== undefined) {
      updateData['daily_fluid'] = input.daily_fluid.toString();
    }

    // Always update the updated_at timestamp
    updateData['updated_at'] = new Date();

    // Update the daily goals record
    const result = await db.update(dailyGoalsTable)
      .set(updateData)
      .where(eq(dailyGoalsTable.id, input.id))
      .returning()
      .execute();

    // Check if record was found and updated
    if (result.length === 0) {
      throw new Error(`Daily goals with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const updatedGoals = result[0];
    return {
      ...updatedGoals,
      daily_calories: parseFloat(updatedGoals.daily_calories),
      daily_protein: parseFloat(updatedGoals.daily_protein),
      daily_carbs: parseFloat(updatedGoals.daily_carbs),
      daily_fats: parseFloat(updatedGoals.daily_fats),
      daily_fluid: parseFloat(updatedGoals.daily_fluid)
    };
  } catch (error) {
    console.error('Daily goals update failed:', error);
    throw error;
  }
};