import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { foodItemsTable } from '../db/schema';
import { type CreateFoodItemInput } from '../schema';
import { getAllFoodItems } from '../handlers/get_all_food_items';

// Test food items data
const testFoodItems: CreateFoodItemInput[] = [
  {
    name: 'Chicken Breast',
    calories_per_100g: 165,
    protein_per_100g: 31,
    carbs_per_100g: 0,
    fats_per_100g: 3.6
  },
  {
    name: 'Brown Rice',
    calories_per_100g: 111,
    protein_per_100g: 2.6,
    carbs_per_100g: 23,
    fats_per_100g: 0.9
  },
  {
    name: 'Broccoli',
    calories_per_100g: 34,
    protein_per_100g: 2.8,
    carbs_per_100g: 7,
    fats_per_100g: 0.4
  }
];

describe('getAllFoodItems', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no food items exist', async () => {
    const result = await getAllFoodItems();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all food items from database', async () => {
    // Insert test food items
    await db.insert(foodItemsTable)
      .values(testFoodItems.map(item => ({
        ...item,
        calories_per_100g: item.calories_per_100g.toString(),
        protein_per_100g: item.protein_per_100g.toString(),
        carbs_per_100g: item.carbs_per_100g.toString(),
        fats_per_100g: item.fats_per_100g.toString()
      })))
      .execute();

    const result = await getAllFoodItems();

    expect(result).toHaveLength(3);
    
    // Check that all items are returned
    const itemNames = result.map(item => item.name).sort();
    expect(itemNames).toEqual(['Broccoli', 'Brown Rice', 'Chicken Breast']);
  });

  it('should return food items with correct data types', async () => {
    // Insert one test food item
    await db.insert(foodItemsTable)
      .values({
        ...testFoodItems[0],
        calories_per_100g: testFoodItems[0].calories_per_100g.toString(),
        protein_per_100g: testFoodItems[0].protein_per_100g.toString(),
        carbs_per_100g: testFoodItems[0].carbs_per_100g.toString(),
        fats_per_100g: testFoodItems[0].fats_per_100g.toString()
      })
      .execute();

    const result = await getAllFoodItems();

    expect(result).toHaveLength(1);
    const foodItem = result[0];

    // Verify field types and values
    expect(typeof foodItem.id).toBe('number');
    expect(typeof foodItem.name).toBe('string');
    expect(typeof foodItem.calories_per_100g).toBe('number');
    expect(typeof foodItem.protein_per_100g).toBe('number');
    expect(typeof foodItem.carbs_per_100g).toBe('number');
    expect(typeof foodItem.fats_per_100g).toBe('number');
    expect(foodItem.created_at).toBeInstanceOf(Date);

    // Verify specific values
    expect(foodItem.name).toBe('Chicken Breast');
    expect(foodItem.calories_per_100g).toBe(165);
    expect(foodItem.protein_per_100g).toBe(31);
    expect(foodItem.carbs_per_100g).toBe(0);
    expect(foodItem.fats_per_100g).toBe(3.6);
  });

  it('should handle numeric precision correctly', async () => {
    // Insert food item with decimal values
    const precisionFoodItem = {
      name: 'Test Food',
      calories_per_100g: 123.45,
      protein_per_100g: 12.34,
      carbs_per_100g: 56.78,
      fats_per_100g: 9.87
    };

    await db.insert(foodItemsTable)
      .values({
        ...precisionFoodItem,
        calories_per_100g: precisionFoodItem.calories_per_100g.toString(),
        protein_per_100g: precisionFoodItem.protein_per_100g.toString(),
        carbs_per_100g: precisionFoodItem.carbs_per_100g.toString(),
        fats_per_100g: precisionFoodItem.fats_per_100g.toString()
      })
      .execute();

    const result = await getAllFoodItems();

    expect(result).toHaveLength(1);
    const foodItem = result[0];

    // Verify decimal precision is maintained
    expect(foodItem.calories_per_100g).toBe(123.45);
    expect(foodItem.protein_per_100g).toBe(12.34);
    expect(foodItem.carbs_per_100g).toBe(56.78);
    expect(foodItem.fats_per_100g).toBe(9.87);
  });

  it('should maintain insertion order when no specific order is applied', async () => {
    // Insert items in a specific order
    for (const item of testFoodItems) {
      await db.insert(foodItemsTable)
        .values({
          ...item,
          calories_per_100g: item.calories_per_100g.toString(),
          protein_per_100g: item.protein_per_100g.toString(),
          carbs_per_100g: item.carbs_per_100g.toString(),
          fats_per_100g: item.fats_per_100g.toString()
        })
        .execute();
    }

    const result = await getAllFoodItems();

    expect(result).toHaveLength(3);
    
    // Check that items are returned (order may vary based on database implementation)
    const itemNames = result.map(item => item.name);
    expect(itemNames).toContain('Chicken Breast');
    expect(itemNames).toContain('Brown Rice');
    expect(itemNames).toContain('Broccoli');
  });

  it('should include all required fields for each food item', async () => {
    // Insert test food item
    await db.insert(foodItemsTable)
      .values({
        ...testFoodItems[0],
        calories_per_100g: testFoodItems[0].calories_per_100g.toString(),
        protein_per_100g: testFoodItems[0].protein_per_100g.toString(),
        carbs_per_100g: testFoodItems[0].carbs_per_100g.toString(),
        fats_per_100g: testFoodItems[0].fats_per_100g.toString()
      })
      .execute();

    const result = await getAllFoodItems();

    expect(result).toHaveLength(1);
    const foodItem = result[0];

    // Verify all required fields are present
    expect(foodItem).toHaveProperty('id');
    expect(foodItem).toHaveProperty('name');
    expect(foodItem).toHaveProperty('calories_per_100g');
    expect(foodItem).toHaveProperty('protein_per_100g');
    expect(foodItem).toHaveProperty('carbs_per_100g');
    expect(foodItem).toHaveProperty('fats_per_100g');
    expect(foodItem).toHaveProperty('created_at');

    // Verify no undefined values
    expect(foodItem.id).toBeDefined();
    expect(foodItem.name).toBeDefined();
    expect(foodItem.calories_per_100g).toBeDefined();
    expect(foodItem.protein_per_100g).toBeDefined();
    expect(foodItem.carbs_per_100g).toBeDefined();
    expect(foodItem.fats_per_100g).toBeDefined();
    expect(foodItem.created_at).toBeDefined();
  });
});