import { db } from '../db';
import { fluidLogsTable } from '../db/schema';
import { type FluidLog } from '../schema';
import { eq, and, gte, lt, desc } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export const getUserFluidLogs = async (userId: number, date?: string): Promise<FluidLog[]> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [eq(fluidLogsTable.user_id, userId)];

    // Add date filter if provided
    if (date) {
      const startDate = new Date(date + 'T00:00:00Z');
      const endDate = new Date(date);
      endDate.setUTCDate(endDate.getUTCDate() + 1); // Next day
      endDate.setUTCHours(0, 0, 0, 0); // Start of next day
      
      conditions.push(
        gte(fluidLogsTable.consumed_at, startDate),
        lt(fluidLogsTable.consumed_at, endDate)
      );
    }

    // Build query with all conditions
    const query = db.select()
      .from(fluidLogsTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(fluidLogsTable.consumed_at));

    const results = await query.execute();

    // Convert numeric fields back to numbers
    return results.map(log => ({
      ...log,
      volume: parseFloat(log.volume)
    }));
  } catch (error) {
    console.error('Failed to get user fluid logs:', error);
    throw error;
  }
};