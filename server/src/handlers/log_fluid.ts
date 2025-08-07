import { db } from '../db';
import { fluidLogsTable, dailySummariesTable, usersTable } from '../db/schema';
import { type LogFluidInput, type FluidLog } from '../schema';
import { eq, and } from 'drizzle-orm';

export const logFluid = async (input: LogFluidInput): Promise<FluidLog> => {
  try {
    // Validate that the user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Default consumed_at to now if not provided
    const consumedAt = input.consumed_at || new Date();

    // Insert fluid log record
    const result = await db.insert(fluidLogsTable)
      .values({
        user_id: input.user_id,
        fluid_type: input.fluid_type,
        volume: input.volume.toString(), // Convert number to string for numeric column
        consumed_at: consumedAt
      })
      .returning()
      .execute();

    const fluidLog = result[0];

    // Update daily summary for the consumption date
    const summaryDate = consumedAt.toISOString().split('T')[0]; // Get YYYY-MM-DD format

    // Check if daily summary exists for this date
    const existingSummary = await db.select()
      .from(dailySummariesTable)
      .where(and(
        eq(dailySummariesTable.user_id, input.user_id),
        eq(dailySummariesTable.summary_date, summaryDate)
      ))
      .execute();

    if (existingSummary.length > 0) {
      // Update existing summary
      const currentTotalFluid = parseFloat(existingSummary[0].total_fluid);
      const newTotalFluid = currentTotalFluid + input.volume;

      await db.update(dailySummariesTable)
        .set({
          total_fluid: newTotalFluid.toString(),
          updated_at: new Date()
        })
        .where(eq(dailySummariesTable.id, existingSummary[0].id))
        .execute();
    } else {
      // Create new summary with this fluid entry
      await db.insert(dailySummariesTable)
        .values({
          user_id: input.user_id,
          summary_date: summaryDate,
          total_calories: '0',
          total_protein: '0',
          total_carbs: '0',
          total_fats: '0',
          total_fluid: input.volume.toString()
        })
        .execute();
    }

    // Convert numeric fields back to numbers before returning
    return {
      ...fluidLog,
      volume: parseFloat(fluidLog.volume)
    };
  } catch (error) {
    console.error('Fluid logging failed:', error);
    throw error;
  }
};