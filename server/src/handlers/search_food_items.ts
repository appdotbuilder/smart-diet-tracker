import { db } from '../db';
import { foodItemsTable } from '../db/schema';
import { type SearchFoodItemsInput, type FoodItem } from '../schema';
import { ilike } from 'drizzle-orm';

export const searchFoodItems = async (input: SearchFoodItemsInput): Promise<FoodItem[]> => {
  try {
    // Perform case-insensitive search on food item names
    const results = await db.select()
      .from(foodItemsTable)
      .where(ilike(foodItemsTable.name, `%${input.query}%`))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(item => ({
      ...item,
      calories_per_100g: parseFloat(item.calories_per_100g),
      protein_per_100g: parseFloat(item.protein_per_100g),
      carbs_per_100g: parseFloat(item.carbs_per_100g),
      fats_per_100g: parseFloat(item.fats_per_100g)
    }));
  } catch (error) {
    console.error('Food items search failed:', error);
    throw error;
  }
};