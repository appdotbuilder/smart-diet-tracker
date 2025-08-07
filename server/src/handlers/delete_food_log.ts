import { db } from '../db';
import { foodLogsTable, dailySummariesTable, foodItemsTable } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const deleteFoodLog = async (logId: number, userId: number): Promise<boolean> => {
  try {
    // First, get the food log entry with food item details to calculate nutritional impact
    const foodLogResult = await db.select({
      id: foodLogsTable.id,
      user_id: foodLogsTable.user_id,
      portion_size: foodLogsTable.portion_size,
      consumed_at: foodLogsTable.consumed_at,
      calories_per_100g: foodItemsTable.calories_per_100g,
      protein_per_100g: foodItemsTable.protein_per_100g,
      carbs_per_100g: foodItemsTable.carbs_per_100g,
      fats_per_100g: foodItemsTable.fats_per_100g
    })
    .from(foodLogsTable)
    .innerJoin(foodItemsTable, eq(foodLogsTable.food_item_id, foodItemsTable.id))
    .where(and(
      eq(foodLogsTable.id, logId),
      eq(foodLogsTable.user_id, userId)
    ))
    .execute();

    // If no log found or doesn't belong to user, return false
    if (foodLogResult.length === 0) {
      return false;
    }

    const foodLog = foodLogResult[0];
    
    // Calculate nutritional values to subtract from daily summary
    const portionSize = parseFloat(foodLog.portion_size);
    const caloriesPerGram = parseFloat(foodLog.calories_per_100g) / 100;
    const proteinPerGram = parseFloat(foodLog.protein_per_100g) / 100;
    const carbsPerGram = parseFloat(foodLog.carbs_per_100g) / 100;
    const fatsPerGram = parseFloat(foodLog.fats_per_100g) / 100;

    const removedCalories = caloriesPerGram * portionSize;
    const removedProtein = proteinPerGram * portionSize;
    const removedCarbs = carbsPerGram * portionSize;
    const removedFats = fatsPerGram * portionSize;

    // Get the date of consumption for daily summary update
    const consumedDate = new Date(foodLog.consumed_at);
    const summaryDate = consumedDate.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Delete the food log entry
    const deleteResult = await db.delete(foodLogsTable)
      .where(and(
        eq(foodLogsTable.id, logId),
        eq(foodLogsTable.user_id, userId)
      ))
      .execute();

    // If deletion failed, return false
    if (deleteResult.rowCount === 0) {
      return false;
    }

    // Update the daily summary by subtracting the removed nutritional values
    await db.update(dailySummariesTable)
      .set({
        total_calories: sql`${dailySummariesTable.total_calories} - ${removedCalories.toString()}`,
        total_protein: sql`${dailySummariesTable.total_protein} - ${removedProtein.toString()}`,
        total_carbs: sql`${dailySummariesTable.total_carbs} - ${removedCarbs.toString()}`,
        total_fats: sql`${dailySummariesTable.total_fats} - ${removedFats.toString()}`,
        updated_at: sql`NOW()`
      })
      .where(and(
        eq(dailySummariesTable.user_id, userId),
        eq(dailySummariesTable.summary_date, summaryDate)
      ))
      .execute();

    return true;
  } catch (error) {
    console.error('Food log deletion failed:', error);
    throw error;
  }
};