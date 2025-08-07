import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { dailyGoalsTable, usersTable } from '../db/schema';
import { type CreateDailyGoalsInput } from '../schema';
import { createDailyGoals } from '../handlers/create_daily_goals';
import { eq } from 'drizzle-orm';

describe('createDailyGoals', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create a test user first for use in tests
  const createTestUser = async () => {
    const result = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    return result[0];
  };

  const testInput: CreateDailyGoalsInput = {
    user_id: 1, // Will be updated with actual user ID in tests
    daily_calories: 2000,
    daily_protein: 150.5,
    daily_carbs: 250.75,
    daily_fats: 65.25,
    daily_fluid: 2500
  };

  it('should create daily goals for existing user', async () => {
    const user = await createTestUser();
    const input = { ...testInput, user_id: user.id };

    const result = await createDailyGoals(input);

    // Basic field validation
    expect(result.user_id).toEqual(user.id);
    expect(result.daily_calories).toEqual(2000);
    expect(result.daily_protein).toEqual(150.5);
    expect(result.daily_carbs).toEqual(250.75);
    expect(result.daily_fats).toEqual(65.25);
    expect(result.daily_fluid).toEqual(2500);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify numeric types are correct after conversion
    expect(typeof result.daily_calories).toBe('number');
    expect(typeof result.daily_protein).toBe('number');
    expect(typeof result.daily_carbs).toBe('number');
    expect(typeof result.daily_fats).toBe('number');
    expect(typeof result.daily_fluid).toBe('number');
  });

  it('should save daily goals to database correctly', async () => {
    const user = await createTestUser();
    const input = { ...testInput, user_id: user.id };

    const result = await createDailyGoals(input);

    // Query the database to verify data was saved correctly
    const savedGoals = await db.select()
      .from(dailyGoalsTable)
      .where(eq(dailyGoalsTable.id, result.id))
      .execute();

    expect(savedGoals).toHaveLength(1);
    expect(savedGoals[0].user_id).toEqual(user.id);
    expect(parseFloat(savedGoals[0].daily_calories)).toEqual(2000);
    expect(parseFloat(savedGoals[0].daily_protein)).toEqual(150.5);
    expect(parseFloat(savedGoals[0].daily_carbs)).toEqual(250.75);
    expect(parseFloat(savedGoals[0].daily_fats)).toEqual(65.25);
    expect(parseFloat(savedGoals[0].daily_fluid)).toEqual(2500);
    expect(savedGoals[0].created_at).toBeInstanceOf(Date);
    expect(savedGoals[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle zero values for optional nutrients', async () => {
    const user = await createTestUser();
    const input: CreateDailyGoalsInput = {
      user_id: user.id,
      daily_calories: 1800,
      daily_protein: 0,
      daily_carbs: 0,
      daily_fats: 0,
      daily_fluid: 1000
    };

    const result = await createDailyGoals(input);

    expect(result.daily_calories).toEqual(1800);
    expect(result.daily_protein).toEqual(0);
    expect(result.daily_carbs).toEqual(0);
    expect(result.daily_fats).toEqual(0);
    expect(result.daily_fluid).toEqual(1000);
  });

  it('should handle decimal values correctly', async () => {
    const user = await createTestUser();
    const input: CreateDailyGoalsInput = {
      user_id: user.id,
      daily_calories: 2250.5,
      daily_protein: 145.75,
      daily_carbs: 280.25,
      daily_fats: 70.5,
      daily_fluid: 2750.5
    };

    const result = await createDailyGoals(input);

    expect(result.daily_calories).toEqual(2250.5);
    expect(result.daily_protein).toEqual(145.75);
    expect(result.daily_carbs).toEqual(280.25);
    expect(result.daily_fats).toEqual(70.5);
    expect(result.daily_fluid).toEqual(2750.5);
  });

  it('should throw error when user does not exist', async () => {
    const input = { ...testInput, user_id: 999 }; // Non-existent user ID

    await expect(createDailyGoals(input)).rejects.toThrow(/user with id 999 not found/i);
  });

  it('should allow multiple daily goals for the same user', async () => {
    const user = await createTestUser();
    const input = { ...testInput, user_id: user.id };

    // Create first set of goals
    const firstGoals = await createDailyGoals(input);

    // Create second set of goals (different values)
    const secondInput: CreateDailyGoalsInput = {
      user_id: user.id,
      daily_calories: 2200,
      daily_protein: 160,
      daily_carbs: 275,
      daily_fats: 70,
      daily_fluid: 3000
    };

    const secondGoals = await createDailyGoals(secondInput);

    // Both should exist and have different IDs
    expect(firstGoals.id).not.toEqual(secondGoals.id);
    expect(firstGoals.daily_calories).toEqual(2000);
    expect(secondGoals.daily_calories).toEqual(2200);

    // Verify both records exist in database
    const allGoals = await db.select()
      .from(dailyGoalsTable)
      .where(eq(dailyGoalsTable.user_id, user.id))
      .execute();

    expect(allGoals).toHaveLength(2);
  });

  it('should handle large numeric values', async () => {
    const user = await createTestUser();
    const input: CreateDailyGoalsInput = {
      user_id: user.id,
      daily_calories: 9999.99,
      daily_protein: 999.99,
      daily_carbs: 999.99,
      daily_fats: 999.99,
      daily_fluid: 99999.99
    };

    const result = await createDailyGoals(input);

    expect(result.daily_calories).toEqual(9999.99);
    expect(result.daily_protein).toEqual(999.99);
    expect(result.daily_carbs).toEqual(999.99);
    expect(result.daily_fats).toEqual(999.99);
    expect(result.daily_fluid).toEqual(99999.99);
  });
});