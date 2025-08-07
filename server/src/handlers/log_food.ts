import { db } from '../db';
import { foodLogsTable, usersTable, foodItemsTable, dailySummariesTable } from '../db/schema';
import { type LogFoodInput, type FoodLog } from '../schema';
import { eq, and } from 'drizzle-orm';

export const logFood = async (input: LogFoodInput): Promise<FoodLog> => {
  try {
    // Validate user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .limit(1)
      .execute();

    if (user.length === 0) {
      throw new Error(`User with ID ${input.user_id} not found`);
    }

    // Validate food item exists
    const foodItem = await db.select()
      .from(foodItemsTable)
      .where(eq(foodItemsTable.id, input.food_item_id))
      .limit(1)
      .execute();

    if (foodItem.length === 0) {
      throw new Error(`Food item with ID ${input.food_item_id} not found`);
    }

    // Set consumed_at to current time if not provided
    const consumedAt = input.consumed_at || new Date();

    // Create food log entry
    const result = await db.insert(foodLogsTable)
      .values({
        user_id: input.user_id,
        food_item_id: input.food_item_id,
        portion_size: input.portion_size.toString(), // Convert number to string for numeric column
        consumed_at: consumedAt
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const foodLog = result[0];
    const convertedResult = {
      ...foodLog,
      portion_size: parseFloat(foodLog.portion_size) // Convert string back to number
    };

    // Update daily summary
    await updateDailySummary(input.user_id, consumedAt, foodItem[0], parseFloat(foodLog.portion_size));

    return convertedResult;
  } catch (error) {
    console.error('Food logging failed:', error);
    throw error;
  }
};

// Helper function to update daily summary
async function updateDailySummary(userId: number, consumedAt: Date, foodItem: any, portionSize: number) {
  // Extract date part for summary
  const summaryDate = consumedAt.toISOString().split('T')[0];

  // Calculate nutritional values based on portion size
  const portionMultiplier = portionSize / 100; // portion_size is in grams, nutrition is per 100g
  const calories = parseFloat(foodItem.calories_per_100g) * portionMultiplier;
  const protein = parseFloat(foodItem.protein_per_100g) * portionMultiplier;
  const carbs = parseFloat(foodItem.carbs_per_100g) * portionMultiplier;
  const fats = parseFloat(foodItem.fats_per_100g) * portionMultiplier;

  // Check if daily summary exists for this user and date
  const existingSummary = await db.select()
    .from(dailySummariesTable)
    .where(
      and(
        eq(dailySummariesTable.user_id, userId),
        eq(dailySummariesTable.summary_date, summaryDate)
      )
    )
    .limit(1)
    .execute();

  if (existingSummary.length > 0) {
    // Update existing summary
    const currentSummary = existingSummary[0];
    await db.update(dailySummariesTable)
      .set({
        total_calories: (parseFloat(currentSummary.total_calories) + calories).toString(),
        total_protein: (parseFloat(currentSummary.total_protein) + protein).toString(),
        total_carbs: (parseFloat(currentSummary.total_carbs) + carbs).toString(),
        total_fats: (parseFloat(currentSummary.total_fats) + fats).toString(),
        updated_at: new Date()
      })
      .where(eq(dailySummariesTable.id, currentSummary.id))
      .execute();
  } else {
    // Create new summary
    await db.insert(dailySummariesTable)
      .values({
        user_id: userId,
        summary_date: summaryDate,
        total_calories: calories.toString(),
        total_protein: protein.toString(),
        total_carbs: carbs.toString(),
        total_fats: fats.toString(),
        total_fluid: '0' // No fluid from food logging
      })
      .execute();
  }
}