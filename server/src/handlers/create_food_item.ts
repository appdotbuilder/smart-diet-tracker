import { db } from '../db';
import { foodItemsTable } from '../db/schema';
import { type CreateFoodItemInput, type FoodItem } from '../schema';

export const createFoodItem = async (input: CreateFoodItemInput): Promise<FoodItem> => {
  try {
    // Insert food item record
    const result = await db.insert(foodItemsTable)
      .values({
        name: input.name,
        calories_per_100g: input.calories_per_100g.toString(), // Convert number to string for numeric column
        protein_per_100g: input.protein_per_100g.toString(), // Convert number to string for numeric column
        carbs_per_100g: input.carbs_per_100g.toString(), // Convert number to string for numeric column
        fats_per_100g: input.fats_per_100g.toString() // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const foodItem = result[0];
    return {
      ...foodItem,
      calories_per_100g: parseFloat(foodItem.calories_per_100g), // Convert string back to number
      protein_per_100g: parseFloat(foodItem.protein_per_100g), // Convert string back to number
      carbs_per_100g: parseFloat(foodItem.carbs_per_100g), // Convert string back to number
      fats_per_100g: parseFloat(foodItem.fats_per_100g) // Convert string back to number
    };
  } catch (error) {
    console.error('Food item creation failed:', error);
    throw error;
  }
};