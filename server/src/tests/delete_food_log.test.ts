import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, foodItemsTable, foodLogsTable, dailySummariesTable } from '../db/schema';
import { deleteFoodLog } from '../handlers/delete_food_log';
import { eq, and } from 'drizzle-orm';

describe('deleteFoodLog', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let otherUserId: number;
  let testFoodItemId: number;
  let testFoodLogId: number;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        { name: 'Test User', email: 'test@example.com' },
        { name: 'Other User', email: 'other@example.com' }
      ])
      .returning()
      .execute();

    testUserId = users[0].id;
    otherUserId = users[1].id;

    // Create test food item
    const foodItems = await db.insert(foodItemsTable)
      .values({
        name: 'Test Apple',
        calories_per_100g: '52.00',
        protein_per_100g: '0.30',
        carbs_per_100g: '14.00',
        fats_per_100g: '0.20'
      })
      .returning()
      .execute();

    testFoodItemId = foodItems[0].id;

    // Create test food log
    const foodLogs = await db.insert(foodLogsTable)
      .values({
        user_id: testUserId,
        food_item_id: testFoodItemId,
        portion_size: '150.00', // 150g apple
        consumed_at: new Date('2024-01-15T12:00:00Z')
      })
      .returning()
      .execute();

    testFoodLogId = foodLogs[0].id;

    // Create daily summary with values that include this food log
    await db.insert(dailySummariesTable)
      .values({
        user_id: testUserId,
        summary_date: '2024-01-15',
        total_calories: '78.00', // 52 * 1.5 = 78 calories from apple
        total_protein: '0.45', // 0.3 * 1.5 = 0.45g protein
        total_carbs: '21.00', // 14 * 1.5 = 21g carbs
        total_fats: '0.30', // 0.2 * 1.5 = 0.3g fats
        total_fluid: '0.00'
      })
      .execute();
  });

  it('should successfully delete food log and update daily summary', async () => {
    const result = await deleteFoodLog(testFoodLogId, testUserId);

    expect(result).toBe(true);

    // Verify food log is deleted
    const foodLogs = await db.select()
      .from(foodLogsTable)
      .where(eq(foodLogsTable.id, testFoodLogId))
      .execute();

    expect(foodLogs).toHaveLength(0);

    // Verify daily summary is updated (nutritional values should be reduced)
    const summaries = await db.select()
      .from(dailySummariesTable)
      .where(and(
        eq(dailySummariesTable.user_id, testUserId),
        eq(dailySummariesTable.summary_date, '2024-01-15')
      ))
      .execute();

    expect(summaries).toHaveLength(1);
    const summary = summaries[0];
    
    // Values should be 0 after removing the only food log entry
    expect(parseFloat(summary.total_calories)).toBeCloseTo(0, 2);
    expect(parseFloat(summary.total_protein)).toBeCloseTo(0, 2);
    expect(parseFloat(summary.total_carbs)).toBeCloseTo(0, 2);
    expect(parseFloat(summary.total_fats)).toBeCloseTo(0, 2);
  });

  it('should return false when food log does not exist', async () => {
    const nonExistentId = 99999;
    const result = await deleteFoodLog(nonExistentId, testUserId);

    expect(result).toBe(false);

    // Verify original food log still exists
    const foodLogs = await db.select()
      .from(foodLogsTable)
      .where(eq(foodLogsTable.id, testFoodLogId))
      .execute();

    expect(foodLogs).toHaveLength(1);
  });

  it('should return false when food log belongs to different user', async () => {
    const result = await deleteFoodLog(testFoodLogId, otherUserId);

    expect(result).toBe(false);

    // Verify original food log still exists
    const foodLogs = await db.select()
      .from(foodLogsTable)
      .where(eq(foodLogsTable.id, testFoodLogId))
      .execute();

    expect(foodLogs).toHaveLength(1);
  });

  it('should handle multiple food logs on same day correctly', async () => {
    // Add another food log for the same day
    const secondFoodLogs = await db.insert(foodLogsTable)
      .values({
        user_id: testUserId,
        food_item_id: testFoodItemId,
        portion_size: '100.00', // 100g apple
        consumed_at: new Date('2024-01-15T18:00:00Z')
      })
      .returning()
      .execute();

    const secondFoodLogId = secondFoodLogs[0].id;

    // Update daily summary to include both food logs
    await db.update(dailySummariesTable)
      .set({
        total_calories: '130.00', // 78 + 52 = 130 calories
        total_protein: '0.75', // 0.45 + 0.30 = 0.75g protein
        total_carbs: '35.00', // 21 + 14 = 35g carbs
        total_fats: '0.50' // 0.30 + 0.20 = 0.50g fats
      })
      .where(and(
        eq(dailySummariesTable.user_id, testUserId),
        eq(dailySummariesTable.summary_date, '2024-01-15')
      ))
      .execute();

    // Delete the first food log
    const result = await deleteFoodLog(testFoodLogId, testUserId);

    expect(result).toBe(true);

    // Verify only first food log is deleted
    const remainingFoodLogs = await db.select()
      .from(foodLogsTable)
      .where(eq(foodLogsTable.user_id, testUserId))
      .execute();

    expect(remainingFoodLogs).toHaveLength(1);
    expect(remainingFoodLogs[0].id).toBe(secondFoodLogId);

    // Verify daily summary reflects only the second food log (52 cal, 0.3g protein, etc.)
    const summaries = await db.select()
      .from(dailySummariesTable)
      .where(and(
        eq(dailySummariesTable.user_id, testUserId),
        eq(dailySummariesTable.summary_date, '2024-01-15')
      ))
      .execute();

    const summary = summaries[0];
    expect(parseFloat(summary.total_calories)).toBeCloseTo(52, 2);
    expect(parseFloat(summary.total_protein)).toBeCloseTo(0.3, 2);
    expect(parseFloat(summary.total_carbs)).toBeCloseTo(14, 2);
    expect(parseFloat(summary.total_fats)).toBeCloseTo(0.2, 2);
  });

  it('should handle deletion when daily summary does not exist', async () => {
    // Delete the daily summary first
    await db.delete(dailySummariesTable)
      .where(and(
        eq(dailySummariesTable.user_id, testUserId),
        eq(dailySummariesTable.summary_date, '2024-01-15')
      ))
      .execute();

    // Deletion should still succeed even without daily summary
    const result = await deleteFoodLog(testFoodLogId, testUserId);

    expect(result).toBe(true);

    // Verify food log is deleted
    const foodLogs = await db.select()
      .from(foodLogsTable)
      .where(eq(foodLogsTable.id, testFoodLogId))
      .execute();

    expect(foodLogs).toHaveLength(0);
  });

  it('should calculate nutritional values correctly for different portion sizes', async () => {
    // Create a food log with specific portion size
    const largeFoodLogs = await db.insert(foodLogsTable)
      .values({
        user_id: testUserId,
        food_item_id: testFoodItemId,
        portion_size: '250.00', // 250g apple
        consumed_at: new Date('2024-01-16T12:00:00Z')
      })
      .returning()
      .execute();

    const largeFoodLogId = largeFoodLogs[0].id;

    // Create daily summary for this date with calculated values
    const expectedCalories = 52 * 2.5; // 130 calories
    const expectedProtein = 0.3 * 2.5; // 0.75g
    const expectedCarbs = 14 * 2.5; // 35g
    const expectedFats = 0.2 * 2.5; // 0.5g

    await db.insert(dailySummariesTable)
      .values({
        user_id: testUserId,
        summary_date: '2024-01-16',
        total_calories: expectedCalories.toString(),
        total_protein: expectedProtein.toString(),
        total_carbs: expectedCarbs.toString(),
        total_fats: expectedFats.toString(),
        total_fluid: '0.00'
      })
      .execute();

    // Delete the food log
    const result = await deleteFoodLog(largeFoodLogId, testUserId);

    expect(result).toBe(true);

    // Verify daily summary is properly updated (should be 0 after deletion)
    const summaries = await db.select()
      .from(dailySummariesTable)
      .where(and(
        eq(dailySummariesTable.user_id, testUserId),
        eq(dailySummariesTable.summary_date, '2024-01-16')
      ))
      .execute();

    const summary = summaries[0];
    expect(parseFloat(summary.total_calories)).toBeCloseTo(0, 2);
    expect(parseFloat(summary.total_protein)).toBeCloseTo(0, 2);
    expect(parseFloat(summary.total_carbs)).toBeCloseTo(0, 2);
    expect(parseFloat(summary.total_fats)).toBeCloseTo(0, 2);
  });
});