import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, foodItemsTable, foodLogsTable, dailySummariesTable } from '../db/schema';
import { type LogFoodInput } from '../schema';
import { logFood } from '../handlers/log_food';
import { eq, and } from 'drizzle-orm';

// Test data setup
const testUser = {
  name: 'Test User',
  email: 'test@example.com'
};

const testFoodItem = {
  name: 'Test Apple',
  calories_per_100g: 52,
  protein_per_100g: 0.3,
  carbs_per_100g: 14,
  fats_per_100g: 0.2
};

const testInput: LogFoodInput = {
  user_id: 1, // Will be set after creating user
  food_item_id: 1, // Will be set after creating food item
  portion_size: 150, // 150 grams
  consumed_at: new Date('2024-01-15T12:00:00Z')
};

describe('logFood', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    testInput.user_id = userResult[0].id;

    // Create test food item
    const foodResult = await db.insert(foodItemsTable)
      .values({
        ...testFoodItem,
        calories_per_100g: testFoodItem.calories_per_100g.toString(),
        protein_per_100g: testFoodItem.protein_per_100g.toString(),
        carbs_per_100g: testFoodItem.carbs_per_100g.toString(),
        fats_per_100g: testFoodItem.fats_per_100g.toString()
      })
      .returning()
      .execute();
    testInput.food_item_id = foodResult[0].id;
  });

  it('should log food consumption successfully', async () => {
    const result = await logFood(testInput);

    // Verify returned data
    expect(result.user_id).toEqual(testInput.user_id);
    expect(result.food_item_id).toEqual(testInput.food_item_id);
    expect(result.portion_size).toEqual(150);
    expect(result.consumed_at).toEqual(new Date('2024-01-15T12:00:00Z'));
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(typeof result.portion_size).toBe('number');
  });

  it('should save food log to database', async () => {
    const result = await logFood(testInput);

    // Query the database to verify the log was saved
    const savedLogs = await db.select()
      .from(foodLogsTable)
      .where(eq(foodLogsTable.id, result.id))
      .execute();

    expect(savedLogs).toHaveLength(1);
    expect(savedLogs[0].user_id).toEqual(testInput.user_id);
    expect(savedLogs[0].food_item_id).toEqual(testInput.food_item_id);
    expect(parseFloat(savedLogs[0].portion_size)).toEqual(150);
    expect(savedLogs[0].consumed_at).toEqual(new Date('2024-01-15T12:00:00Z'));
  });

  it('should create new daily summary when none exists', async () => {
    await logFood(testInput);

    // Check if daily summary was created
    const summaryDate = testInput.consumed_at!.toISOString().split('T')[0];
    const summaries = await db.select()
      .from(dailySummariesTable)
      .where(
        and(
          eq(dailySummariesTable.user_id, testInput.user_id),
          eq(dailySummariesTable.summary_date, summaryDate)
        )
      )
      .execute();

    expect(summaries).toHaveLength(1);

    // Verify calculated nutritional values (150g of apple)
    const summary = summaries[0];
    expect(parseFloat(summary.total_calories)).toBeCloseTo(78, 1); // 52 * 1.5
    expect(parseFloat(summary.total_protein)).toBeCloseTo(0.45, 2); // 0.3 * 1.5
    expect(parseFloat(summary.total_carbs)).toBeCloseTo(21, 1); // 14 * 1.5
    expect(parseFloat(summary.total_fats)).toBeCloseTo(0.3, 2); // 0.2 * 1.5
    expect(parseFloat(summary.total_fluid)).toBe(0);
  });

  it('should update existing daily summary', async () => {
    // First food log
    await logFood(testInput);

    // Second food log (same day)
    const secondInput = {
      ...testInput,
      portion_size: 100 // 100g more
    };
    await logFood(secondInput);

    // Check if summary was updated (not duplicated)
    const summaryDate = testInput.consumed_at!.toISOString().split('T')[0];
    const summaries = await db.select()
      .from(dailySummariesTable)
      .where(
        and(
          eq(dailySummariesTable.user_id, testInput.user_id),
          eq(dailySummariesTable.summary_date, summaryDate)
        )
      )
      .execute();

    expect(summaries).toHaveLength(1);

    // Verify accumulated nutritional values (250g total of apple)
    const summary = summaries[0];
    expect(parseFloat(summary.total_calories)).toBeCloseTo(130, 1); // 52 * 2.5
    expect(parseFloat(summary.total_protein)).toBeCloseTo(0.75, 2); // 0.3 * 2.5
    expect(parseFloat(summary.total_carbs)).toBeCloseTo(35, 1); // 14 * 2.5
    expect(parseFloat(summary.total_fats)).toBeCloseTo(0.5, 2); // 0.2 * 2.5
  });

  it('should use current time when consumed_at is not provided', async () => {
    const inputWithoutTime = {
      user_id: testInput.user_id,
      food_item_id: testInput.food_item_id,
      portion_size: 150
    };

    const beforeTime = new Date();
    const result = await logFood(inputWithoutTime);
    const afterTime = new Date();

    expect(result.consumed_at).toBeInstanceOf(Date);
    expect(result.consumed_at.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    expect(result.consumed_at.getTime()).toBeLessThanOrEqual(afterTime.getTime());
  });

  it('should throw error when user does not exist', async () => {
    const invalidInput = {
      ...testInput,
      user_id: 99999 // Non-existent user ID
    };

    await expect(logFood(invalidInput)).rejects.toThrow(/User with ID 99999 not found/i);
  });

  it('should throw error when food item does not exist', async () => {
    const invalidInput = {
      ...testInput,
      food_item_id: 99999 // Non-existent food item ID
    };

    await expect(logFood(invalidInput)).rejects.toThrow(/Food item with ID 99999 not found/i);
  });

  it('should handle different portion sizes correctly', async () => {
    // Test with small portion (50g)
    const smallPortionInput = {
      ...testInput,
      portion_size: 50
    };

    await logFood(smallPortionInput);

    const summaryDate = testInput.consumed_at!.toISOString().split('T')[0];
    const summaries = await db.select()
      .from(dailySummariesTable)
      .where(
        and(
          eq(dailySummariesTable.user_id, testInput.user_id),
          eq(dailySummariesTable.summary_date, summaryDate)
        )
      )
      .execute();

    const summary = summaries[0];
    expect(parseFloat(summary.total_calories)).toBeCloseTo(26, 1); // 52 * 0.5
    expect(parseFloat(summary.total_protein)).toBeCloseTo(0.15, 2); // 0.3 * 0.5
  });

  it('should handle multiple logs for different dates', async () => {
    // Log for first date
    await logFood(testInput);

    // Log for second date
    const secondDateInput = {
      ...testInput,
      consumed_at: new Date('2024-01-16T12:00:00Z')
    };
    await logFood(secondDateInput);

    // Should have two separate daily summaries
    const summaries = await db.select()
      .from(dailySummariesTable)
      .where(eq(dailySummariesTable.user_id, testInput.user_id))
      .execute();

    expect(summaries).toHaveLength(2);

    // Each summary should have the same values (same portion logged)
    summaries.forEach(summary => {
      expect(parseFloat(summary.total_calories)).toBeCloseTo(78, 1);
      expect(parseFloat(summary.total_protein)).toBeCloseTo(0.45, 2);
    });
  });
});