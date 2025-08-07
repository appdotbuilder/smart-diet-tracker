import { db } from '../db';
import { 
  dailyGoalsTable, 
  dailySummariesTable, 
  foodLogsTable, 
  fluidLogsTable,
  foodItemsTable 
} from '../db/schema';
import { type GetUserDailyProgressInput, type DailyProgress } from '../schema';
import { eq, and, gte, lt, desc } from 'drizzle-orm';

export const getUserDailyProgress = async (input: GetUserDailyProgressInput): Promise<DailyProgress> => {
  try {
    const { user_id, date } = input;

    // Fetch user's daily goals (most recent by updated_at)
    const goalsResult = await db.select()
      .from(dailyGoalsTable)
      .where(eq(dailyGoalsTable.user_id, user_id))
      .orderBy(desc(dailyGoalsTable.updated_at))
      .limit(1)
      .execute();

    const goals = goalsResult.length > 0 ? {
      ...goalsResult[0],
      daily_calories: parseFloat(goalsResult[0].daily_calories),
      daily_protein: parseFloat(goalsResult[0].daily_protein),
      daily_carbs: parseFloat(goalsResult[0].daily_carbs),
      daily_fats: parseFloat(goalsResult[0].daily_fats),
      daily_fluid: parseFloat(goalsResult[0].daily_fluid)
    } : null;

    // Fetch daily summary for the specific date (date field)
    const summaryResult = await db.select()
      .from(dailySummariesTable)
      .where(and(
        eq(dailySummariesTable.user_id, user_id),
        eq(dailySummariesTable.summary_date, date)
      ))
      .execute();

    const summary = summaryResult.length > 0 ? {
      ...summaryResult[0],
      summary_date: new Date(summaryResult[0].summary_date),
      total_calories: parseFloat(summaryResult[0].total_calories),
      total_protein: parseFloat(summaryResult[0].total_protein),
      total_carbs: parseFloat(summaryResult[0].total_carbs),
      total_fats: parseFloat(summaryResult[0].total_fats),
      total_fluid: parseFloat(summaryResult[0].total_fluid)
    } : null;

    // Create date range for timestamp filtering (start and end of day)
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    // Fetch food logs for the specific date with food item details
    const foodLogsResult = await db.select()
      .from(foodLogsTable)
      .innerJoin(foodItemsTable, eq(foodLogsTable.food_item_id, foodItemsTable.id))
      .where(and(
        eq(foodLogsTable.user_id, user_id),
        gte(foodLogsTable.consumed_at, startOfDay),
        lt(foodLogsTable.consumed_at, endOfDay)
      ))
      .execute();

    const food_logs = foodLogsResult.map(result => ({
      ...result.food_logs,
      portion_size: parseFloat(result.food_logs.portion_size)
    }));

    // Fetch fluid logs for the specific date
    const fluidLogsResult = await db.select()
      .from(fluidLogsTable)
      .where(and(
        eq(fluidLogsTable.user_id, user_id),
        gte(fluidLogsTable.consumed_at, startOfDay),
        lt(fluidLogsTable.consumed_at, endOfDay)
      ))
      .execute();

    const fluid_logs = fluidLogsResult.map(log => ({
      ...log,
      volume: parseFloat(log.volume)
    }));

    // Calculate progress percentages
    const progress_percentages = {
      calories: goals && summary ? Math.round((summary.total_calories / goals.daily_calories) * 100) : 0,
      protein: goals && summary ? Math.round((summary.total_protein / goals.daily_protein) * 100) : 0,
      carbs: goals && summary ? Math.round((summary.total_carbs / goals.daily_carbs) * 100) : 0,
      fats: goals && summary ? Math.round((summary.total_fats / goals.daily_fats) * 100) : 0,
      fluid: goals && summary ? Math.round((summary.total_fluid / goals.daily_fluid) * 100) : 0
    };

    return {
      date,
      goals,
      summary,
      food_logs,
      fluid_logs,
      progress_percentages
    };
  } catch (error) {
    console.error('Failed to get user daily progress:', error);
    throw error;
  }
};