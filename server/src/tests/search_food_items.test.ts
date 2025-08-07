import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { foodItemsTable } from '../db/schema';
import { type SearchFoodItemsInput } from '../schema';
import { searchFoodItems } from '../handlers/search_food_items';

// Test food items data
const testFoodItems = [
  {
    name: 'Apple',
    calories_per_100g: '52',
    protein_per_100g: '0.3',
    carbs_per_100g: '13.8',
    fats_per_100g: '0.2'
  },
  {
    name: 'Banana',
    calories_per_100g: '89',
    protein_per_100g: '1.1',
    carbs_per_100g: '22.8',
    fats_per_100g: '0.3'
  },
  {
    name: 'Apple Pie',
    calories_per_100g: '237',
    protein_per_100g: '2.4',
    carbs_per_100g: '34.4',
    fats_per_100g: '10.6'
  },
  {
    name: 'Chicken Breast',
    calories_per_100g: '165',
    protein_per_100g: '31.0',
    carbs_per_100g: '0.0',
    fats_per_100g: '3.6'
  }
];

describe('searchFoodItems', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    // Insert test food items before each test
    await db.insert(foodItemsTable).values(testFoodItems).execute();
  });

  it('should find food items by exact name match', async () => {
    const input: SearchFoodItemsInput = { query: 'Apple' };
    const results = await searchFoodItems(input);

    expect(results).toHaveLength(2); // Apple and Apple Pie
    expect(results[0].name).toEqual('Apple');
    expect(results[1].name).toEqual('Apple Pie');
    
    // Verify numeric conversion
    expect(typeof results[0].calories_per_100g).toBe('number');
    expect(results[0].calories_per_100g).toEqual(52);
  });

  it('should perform case-insensitive search', async () => {
    const input: SearchFoodItemsInput = { query: 'apple' };
    const results = await searchFoodItems(input);

    expect(results).toHaveLength(2);
    expect(results.some(item => item.name === 'Apple')).toBe(true);
    expect(results.some(item => item.name === 'Apple Pie')).toBe(true);
  });

  it('should find food items by partial name match', async () => {
    const input: SearchFoodItemsInput = { query: 'ban' };
    const results = await searchFoodItems(input);

    expect(results).toHaveLength(1);
    expect(results[0].name).toEqual('Banana');
    expect(results[0].calories_per_100g).toEqual(89);
    expect(results[0].protein_per_100g).toEqual(1.1);
  });

  it('should return all numeric fields as numbers', async () => {
    const input: SearchFoodItemsInput = { query: 'Chicken' };
    const results = await searchFoodItems(input);

    expect(results).toHaveLength(1);
    const chicken = results[0];
    
    // Verify all numeric fields are properly converted
    expect(typeof chicken.calories_per_100g).toBe('number');
    expect(typeof chicken.protein_per_100g).toBe('number');
    expect(typeof chicken.carbs_per_100g).toBe('number');
    expect(typeof chicken.fats_per_100g).toBe('number');
    
    expect(chicken.calories_per_100g).toEqual(165);
    expect(chicken.protein_per_100g).toEqual(31.0);
    expect(chicken.carbs_per_100g).toEqual(0.0);
    expect(chicken.fats_per_100g).toEqual(3.6);
  });

  it('should return empty array when no matches found', async () => {
    const input: SearchFoodItemsInput = { query: 'NonexistentFood' };
    const results = await searchFoodItems(input);

    expect(results).toHaveLength(0);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should handle search with special characters', async () => {
    // Insert food item with special characters
    await db.insert(foodItemsTable).values([{
      name: 'Café au Lait',
      calories_per_100g: '25',
      protein_per_100g: '1.0',
      carbs_per_100g: '3.5',
      fats_per_100g: '1.2'
    }]).execute();

    const input: SearchFoodItemsInput = { query: 'Café' };
    const results = await searchFoodItems(input);

    expect(results).toHaveLength(1);
    expect(results[0].name).toEqual('Café au Lait');
  });

  it('should return results with all required fields', async () => {
    const input: SearchFoodItemsInput = { query: 'Apple' };
    const results = await searchFoodItems(input);

    expect(results.length).toBeGreaterThan(0);
    
    results.forEach(item => {
      expect(item.id).toBeDefined();
      expect(typeof item.id).toBe('number');
      expect(item.name).toBeDefined();
      expect(typeof item.name).toBe('string');
      expect(item.calories_per_100g).toBeDefined();
      expect(typeof item.calories_per_100g).toBe('number');
      expect(item.protein_per_100g).toBeDefined();
      expect(typeof item.protein_per_100g).toBe('number');
      expect(item.carbs_per_100g).toBeDefined();
      expect(typeof item.carbs_per_100g).toBe('number');
      expect(item.fats_per_100g).toBeDefined();
      expect(typeof item.fats_per_100g).toBe('number');
      expect(item.created_at).toBeInstanceOf(Date);
    });
  });
});