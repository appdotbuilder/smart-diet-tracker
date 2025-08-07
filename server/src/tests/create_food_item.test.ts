import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { foodItemsTable } from '../db/schema';
import { type CreateFoodItemInput } from '../schema';
import { createFoodItem } from '../handlers/create_food_item';
import { eq, like } from 'drizzle-orm';

// Simple test input
const testInput: CreateFoodItemInput = {
  name: 'Chicken Breast',
  calories_per_100g: 165,
  protein_per_100g: 31,
  carbs_per_100g: 0,
  fats_per_100g: 3.6
};

describe('createFoodItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a food item', async () => {
    const result = await createFoodItem(testInput);

    // Basic field validation
    expect(result.name).toEqual('Chicken Breast');
    expect(result.calories_per_100g).toEqual(165);
    expect(result.protein_per_100g).toEqual(31);
    expect(result.carbs_per_100g).toEqual(0);
    expect(result.fats_per_100g).toEqual(3.6);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify numeric types are properly converted
    expect(typeof result.calories_per_100g).toBe('number');
    expect(typeof result.protein_per_100g).toBe('number');
    expect(typeof result.carbs_per_100g).toBe('number');
    expect(typeof result.fats_per_100g).toBe('number');
  });

  it('should save food item to database', async () => {
    const result = await createFoodItem(testInput);

    // Query using proper drizzle syntax
    const foodItems = await db.select()
      .from(foodItemsTable)
      .where(eq(foodItemsTable.id, result.id))
      .execute();

    expect(foodItems).toHaveLength(1);
    expect(foodItems[0].name).toEqual('Chicken Breast');
    expect(parseFloat(foodItems[0].calories_per_100g)).toEqual(165);
    expect(parseFloat(foodItems[0].protein_per_100g)).toEqual(31);
    expect(parseFloat(foodItems[0].carbs_per_100g)).toEqual(0);
    expect(parseFloat(foodItems[0].fats_per_100g)).toEqual(3.6);
    expect(foodItems[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle decimal values correctly', async () => {
    const decimalInput: CreateFoodItemInput = {
      name: 'Almonds',
      calories_per_100g: 576.28,
      protein_per_100g: 21.15,
      carbs_per_100g: 21.55,
      fats_per_100g: 49.93
    };

    const result = await createFoodItem(decimalInput);

    expect(result.calories_per_100g).toEqual(576.28);
    expect(result.protein_per_100g).toEqual(21.15);
    expect(result.carbs_per_100g).toEqual(21.55);
    expect(result.fats_per_100g).toEqual(49.93);

    // Verify database storage
    const foodItems = await db.select()
      .from(foodItemsTable)
      .where(eq(foodItemsTable.id, result.id))
      .execute();

    expect(parseFloat(foodItems[0].calories_per_100g)).toEqual(576.28);
    expect(parseFloat(foodItems[0].protein_per_100g)).toEqual(21.15);
    expect(parseFloat(foodItems[0].carbs_per_100g)).toEqual(21.55);
    expect(parseFloat(foodItems[0].fats_per_100g)).toEqual(49.93);
  });

  it('should handle zero values correctly', async () => {
    const zeroInput: CreateFoodItemInput = {
      name: 'Pure Water',
      calories_per_100g: 0,
      protein_per_100g: 0,
      carbs_per_100g: 0,
      fats_per_100g: 0
    };

    const result = await createFoodItem(zeroInput);

    expect(result.calories_per_100g).toEqual(0);
    expect(result.protein_per_100g).toEqual(0);
    expect(result.carbs_per_100g).toEqual(0);
    expect(result.fats_per_100g).toEqual(0);

    // Verify database storage
    const foodItems = await db.select()
      .from(foodItemsTable)
      .where(eq(foodItemsTable.id, result.id))
      .execute();

    expect(parseFloat(foodItems[0].calories_per_100g)).toEqual(0);
    expect(parseFloat(foodItems[0].protein_per_100g)).toEqual(0);
    expect(parseFloat(foodItems[0].carbs_per_100g)).toEqual(0);
    expect(parseFloat(foodItems[0].fats_per_100g)).toEqual(0);
  });

  it('should allow creation of multiple food items', async () => {
    const input1: CreateFoodItemInput = {
      name: 'Apple',
      calories_per_100g: 52,
      protein_per_100g: 0.3,
      carbs_per_100g: 13.8,
      fats_per_100g: 0.2
    };

    const input2: CreateFoodItemInput = {
      name: 'Banana',
      calories_per_100g: 89,
      protein_per_100g: 1.1,
      carbs_per_100g: 22.8,
      fats_per_100g: 0.3
    };

    const result1 = await createFoodItem(input1);
    const result2 = await createFoodItem(input2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.name).toEqual('Apple');
    expect(result2.name).toEqual('Banana');

    // Verify both items exist in database
    const allFoodItems = await db.select()
      .from(foodItemsTable)
      .execute();

    expect(allFoodItems).toHaveLength(2);
    expect(allFoodItems.map(item => item.name)).toContain('Apple');
    expect(allFoodItems.map(item => item.name)).toContain('Banana');
  });

  it('should query food items by name pattern', async () => {
    // Create test food items
    await createFoodItem({
      name: 'Chicken Breast',
      calories_per_100g: 165,
      protein_per_100g: 31,
      carbs_per_100g: 0,
      fats_per_100g: 3.6
    });

    await createFoodItem({
      name: 'Chicken Thigh',
      calories_per_100g: 209,
      protein_per_100g: 26,
      carbs_per_100g: 0,
      fats_per_100g: 10.9
    });

    await createFoodItem({
      name: 'Beef Steak',
      calories_per_100g: 271,
      protein_per_100g: 25,
      carbs_per_100g: 0,
      fats_per_100g: 19
    });

    // Test search functionality - demonstration of pattern matching
    const chickenItems = await db.select()
      .from(foodItemsTable)
      .where(like(foodItemsTable.name, '%Chicken%'))
      .execute();

    expect(chickenItems.length).toEqual(2);
    chickenItems.forEach(item => {
      expect(item.name).toContain('Chicken');
      expect(parseFloat(item.protein_per_100g)).toBeGreaterThan(20); // Both chicken items have high protein
    });
  });
});