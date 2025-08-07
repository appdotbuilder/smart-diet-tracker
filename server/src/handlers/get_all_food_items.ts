import { db } from '../db';
import { foodItemsTable } from '../db/schema';
import { type FoodItem } from '../schema';

export const getAllFoodItems = async (): Promise<FoodItem[]> => {
  try {
    // Fetch all food items from the database
    const results = await db.select()
      .from(foodItemsTable)
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
    console.error('Failed to fetch food items:', error);
    throw error;
  }
};