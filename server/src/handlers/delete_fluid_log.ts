import { db } from '../db';
import { fluidLogsTable, dailySummariesTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const deleteFluidLog = async (logId: number, userId: number): Promise<boolean> => {
  try {
    // First, find and validate the fluid log belongs to the user
    const fluidLogs = await db.select()
      .from(fluidLogsTable)
      .where(and(
        eq(fluidLogsTable.id, logId),
        eq(fluidLogsTable.user_id, userId)
      ))
      .execute();

    if (fluidLogs.length === 0) {
      return false; // Log doesn't exist or doesn't belong to user
    }

    const fluidLog = fluidLogs[0];
    const volumeToRemove = parseFloat(fluidLog.volume);
    const logDate = fluidLog.consumed_at.toISOString().split('T')[0]; // Get YYYY-MM-DD format

    // Delete the fluid log
    const deleteResult = await db.delete(fluidLogsTable)
      .where(and(
        eq(fluidLogsTable.id, logId),
        eq(fluidLogsTable.user_id, userId)
      ))
      .execute();

    if (deleteResult.rowCount === 0) {
      return false; // Nothing was deleted
    }

    // Update the daily summary by subtracting the removed fluid volume
    const existingSummaries = await db.select()
      .from(dailySummariesTable)
      .where(and(
        eq(dailySummariesTable.user_id, userId),
        eq(dailySummariesTable.summary_date, logDate)
      ))
      .execute();

    if (existingSummaries.length > 0) {
      const currentTotalFluid = parseFloat(existingSummaries[0].total_fluid);
      const newTotalFluid = Math.max(0, currentTotalFluid - volumeToRemove); // Ensure non-negative

      await db.update(dailySummariesTable)
        .set({
          total_fluid: newTotalFluid.toString(),
          updated_at: new Date()
        })
        .where(and(
          eq(dailySummariesTable.user_id, userId),
          eq(dailySummariesTable.summary_date, logDate)
        ))
        .execute();
    }

    return true;
  } catch (error) {
    console.error('Fluid log deletion failed:', error);
    throw error;
  }
};