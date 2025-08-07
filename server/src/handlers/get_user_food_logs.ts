import { db } from '../db';
import { foodLogsTable } from '../db/schema';
import { type FoodLog } from '../schema';
import { eq, and, gte, lt, desc } from 'drizzle-orm';

export const getUserFoodLogs = async (userId: number, date?: string): Promise<FoodLog[]> => {
  try {
    let results;

    if (date) {
      // Query with date filtering
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1); // Next day for range filter
      
      results = await db.select()
        .from(foodLogsTable)
        .where(
          and(
            eq(foodLogsTable.user_id, userId),
            gte(foodLogsTable.consumed_at, startDate),
            lt(foodLogsTable.consumed_at, endDate)
          )
        )
        .orderBy(desc(foodLogsTable.consumed_at))
        .execute();
    } else {
      // Query without date filtering
      results = await db.select()
        .from(foodLogsTable)
        .where(eq(foodLogsTable.user_id, userId))
        .orderBy(desc(foodLogsTable.consumed_at))
        .execute();
    }

    // Convert numeric fields back to numbers before returning
    return results.map(log => ({
      ...log,
      portion_size: parseFloat(log.portion_size) // Convert string back to number
    }));
  } catch (error) {
    console.error('Get user food logs failed:', error);
    throw error;
  }
};