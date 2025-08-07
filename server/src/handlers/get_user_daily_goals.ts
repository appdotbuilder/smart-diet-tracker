import { db } from '../db';
import { dailyGoalsTable } from '../db/schema';
import { type DailyGoals } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getUserDailyGoals = async (userId: number): Promise<DailyGoals | null> => {
  try {
    // Get the latest daily goals for the user, ordered by created_at descending
    const result = await db.select()
      .from(dailyGoalsTable)
      .where(eq(dailyGoalsTable.user_id, userId))
      .orderBy(desc(dailyGoalsTable.created_at))
      .limit(1)
      .execute();

    if (result.length === 0) {
      return null;
    }

    const dailyGoals = result[0];
    
    // Convert numeric fields back to numbers
    return {
      ...dailyGoals,
      daily_calories: parseFloat(dailyGoals.daily_calories),
      daily_protein: parseFloat(dailyGoals.daily_protein),
      daily_carbs: parseFloat(dailyGoals.daily_carbs),
      daily_fats: parseFloat(dailyGoals.daily_fats),
      daily_fluid: parseFloat(dailyGoals.daily_fluid)
    };
  } catch (error) {
    console.error('Get user daily goals failed:', error);
    throw error;
  }
};