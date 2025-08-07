import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, foodItemsTable, foodLogsTable } from '../db/schema';
import { getUserFoodLogs } from '../handlers/get_user_food_logs';

describe('getUserFoodLogs', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testFoodItemId: number;
  let otherUserId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create another user
    const otherUserResult = await db.insert(usersTable)
      .values({
        name: 'Other User',
        email: 'other@example.com'
      })
      .returning()
      .execute();
    otherUserId = otherUserResult[0].id;

    // Create test food item
    const foodItemResult = await db.insert(foodItemsTable)
      .values({
        name: 'Test Food',
        calories_per_100g: '100.5',
        protein_per_100g: '10.0',
        carbs_per_100g: '20.0',
        fats_per_100g: '5.0'
      })
      .returning()
      .execute();
    testFoodItemId = foodItemResult[0].id;
  });

  it('should return empty array for user with no food logs', async () => {
    const result = await getUserFoodLogs(testUserId);

    expect(result).toEqual([]);
  });

  it('should return all food logs for a user when no date filter is provided', async () => {
    // Create test food logs
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    await db.insert(foodLogsTable)
      .values([
        {
          user_id: testUserId,
          food_item_id: testFoodItemId,
          portion_size: '150.5',
          consumed_at: now
        },
        {
          user_id: testUserId,
          food_item_id: testFoodItemId,
          portion_size: '200.0',
          consumed_at: yesterday
        }
      ])
      .execute();

    const result = await getUserFoodLogs(testUserId);

    expect(result).toHaveLength(2);
    // Results are ordered by consumed_at descending, so "now" comes first
    expect(result[0].user_id).toEqual(testUserId);
    expect(result[0].food_item_id).toEqual(testFoodItemId);
    expect(typeof result[0].portion_size).toBe('number');
    expect(result[0].portion_size).toEqual(150.5); // The "now" record with 150.5
    expect(result[0].consumed_at).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].id).toBeDefined();
    
    // Second record should be the yesterday one
    expect(result[1].portion_size).toEqual(200.0);
    expect(result[1].consumed_at < result[0].consumed_at).toBe(true);
  });

  it('should filter food logs by specific date', async () => {
    const targetDate = new Date('2024-01-15');
    const otherDate = new Date('2024-01-16');
    
    // Create food logs for different dates
    await db.insert(foodLogsTable)
      .values([
        {
          user_id: testUserId,
          food_item_id: testFoodItemId,
          portion_size: '100.0',
          consumed_at: targetDate
        },
        {
          user_id: testUserId,
          food_item_id: testFoodItemId,
          portion_size: '200.0',
          consumed_at: otherDate
        }
      ])
      .execute();

    const result = await getUserFoodLogs(testUserId, '2024-01-15');

    expect(result).toHaveLength(1);
    expect(result[0].portion_size).toEqual(100.0);
    expect(result[0].consumed_at.toISOString().startsWith('2024-01-15')).toBe(true);
  });

  it('should not return food logs from other users', async () => {
    // Create food logs for different users
    await db.insert(foodLogsTable)
      .values([
        {
          user_id: testUserId,
          food_item_id: testFoodItemId,
          portion_size: '100.0',
          consumed_at: new Date()
        },
        {
          user_id: otherUserId,
          food_item_id: testFoodItemId,
          portion_size: '200.0',
          consumed_at: new Date()
        }
      ])
      .execute();

    const result = await getUserFoodLogs(testUserId);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(testUserId);
    expect(result[0].portion_size).toEqual(100.0);
  });

  it('should return empty array when date has no logs', async () => {
    // Create food log for different date
    await db.insert(foodLogsTable)
      .values({
        user_id: testUserId,
        food_item_id: testFoodItemId,
        portion_size: '100.0',
        consumed_at: new Date('2024-01-15')
      })
      .execute();

    const result = await getUserFoodLogs(testUserId, '2024-01-16');

    expect(result).toEqual([]);
  });

  it('should handle multiple food logs on the same date', async () => {
    const targetDate = new Date('2024-01-15T10:00:00Z');
    const sameDate = new Date('2024-01-15T15:30:00Z');
    
    await db.insert(foodLogsTable)
      .values([
        {
          user_id: testUserId,
          food_item_id: testFoodItemId,
          portion_size: '100.5',
          consumed_at: targetDate
        },
        {
          user_id: testUserId,
          food_item_id: testFoodItemId,
          portion_size: '75.25',
          consumed_at: sameDate
        }
      ])
      .execute();

    const result = await getUserFoodLogs(testUserId, '2024-01-15');

    expect(result).toHaveLength(2);
    expect(result.every(log => log.user_id === testUserId)).toBe(true);
    expect(result.find(log => log.portion_size === 100.5)).toBeDefined();
    expect(result.find(log => log.portion_size === 75.25)).toBeDefined();
  });

  it('should correctly convert numeric portion_size field', async () => {
    await db.insert(foodLogsTable)
      .values({
        user_id: testUserId,
        food_item_id: testFoodItemId,
        portion_size: '123.45',
        consumed_at: new Date()
      })
      .execute();

    const result = await getUserFoodLogs(testUserId);

    expect(result).toHaveLength(1);
    expect(typeof result[0].portion_size).toBe('number');
    expect(result[0].portion_size).toEqual(123.45);
  });

  it('should handle date range boundary correctly', async () => {
    // Test logs at the very end of the day and beginning of next day
    const endOfDay = new Date('2024-01-15T23:59:59Z');
    const startOfNextDay = new Date('2024-01-16T00:00:01Z');
    
    await db.insert(foodLogsTable)
      .values([
        {
          user_id: testUserId,
          food_item_id: testFoodItemId,
          portion_size: '100.0',
          consumed_at: endOfDay
        },
        {
          user_id: testUserId,
          food_item_id: testFoodItemId,
          portion_size: '200.0',
          consumed_at: startOfNextDay
        }
      ])
      .execute();

    const result = await getUserFoodLogs(testUserId, '2024-01-15');

    expect(result).toHaveLength(1);
    expect(result[0].portion_size).toEqual(100.0);
    expect(result[0].consumed_at.toISOString().startsWith('2024-01-15')).toBe(true);
  });
});