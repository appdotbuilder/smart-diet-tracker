import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, dailyGoalsTable } from '../db/schema';
import { type UpdateDailyGoalsInput, type CreateUserInput, type CreateDailyGoalsInput } from '../schema';
import { updateDailyGoals } from '../handlers/update_daily_goals';
import { eq } from 'drizzle-orm';

describe('updateDailyGoals', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create a user for testing
  const createTestUser = async (): Promise<number> => {
    const userInput: CreateUserInput = {
      name: 'Test User',
      email: 'test@example.com'
    };

    const result = await db.insert(usersTable)
      .values(userInput)
      .returning()
      .execute();

    return result[0].id;
  };

  // Helper to create initial daily goals
  const createTestDailyGoals = async (userId: number): Promise<number> => {
    const goalsInput: CreateDailyGoalsInput = {
      user_id: userId,
      daily_calories: 2000,
      daily_protein: 150,
      daily_carbs: 250,
      daily_fats: 67,
      daily_fluid: 2000
    };

    const result = await db.insert(dailyGoalsTable)
      .values({
        user_id: goalsInput.user_id,
        daily_calories: goalsInput.daily_calories.toString(),
        daily_protein: goalsInput.daily_protein.toString(),
        daily_carbs: goalsInput.daily_carbs.toString(),
        daily_fats: goalsInput.daily_fats.toString(),
        daily_fluid: goalsInput.daily_fluid.toString()
      })
      .returning()
      .execute();

    return result[0].id;
  };

  it('should update single field (calories only)', async () => {
    const userId = await createTestUser();
    const goalsId = await createTestDailyGoals(userId);

    const updateInput: UpdateDailyGoalsInput = {
      id: goalsId,
      daily_calories: 2500
    };

    const result = await updateDailyGoals(updateInput);

    // Verify updated field
    expect(result.id).toEqual(goalsId);
    expect(result.user_id).toEqual(userId);
    expect(result.daily_calories).toEqual(2500);
    
    // Verify other fields remain unchanged
    expect(result.daily_protein).toEqual(150);
    expect(result.daily_carbs).toEqual(250);
    expect(result.daily_fats).toEqual(67);
    expect(result.daily_fluid).toEqual(2000);
    
    // Verify timestamps
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(result.created_at.getTime());
  });

  it('should update multiple fields', async () => {
    const userId = await createTestUser();
    const goalsId = await createTestDailyGoals(userId);

    const updateInput: UpdateDailyGoalsInput = {
      id: goalsId,
      daily_calories: 2200,
      daily_protein: 180,
      daily_fluid: 2500
    };

    const result = await updateDailyGoals(updateInput);

    // Verify updated fields
    expect(result.daily_calories).toEqual(2200);
    expect(result.daily_protein).toEqual(180);
    expect(result.daily_fluid).toEqual(2500);
    
    // Verify unchanged fields
    expect(result.daily_carbs).toEqual(250);
    expect(result.daily_fats).toEqual(67);
    
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update all nutrition fields', async () => {
    const userId = await createTestUser();
    const goalsId = await createTestDailyGoals(userId);

    const updateInput: UpdateDailyGoalsInput = {
      id: goalsId,
      daily_calories: 1800,
      daily_protein: 120,
      daily_carbs: 200,
      daily_fats: 60,
      daily_fluid: 1800
    };

    const result = await updateDailyGoals(updateInput);

    // Verify all fields updated
    expect(result.daily_calories).toEqual(1800);
    expect(result.daily_protein).toEqual(120);
    expect(result.daily_carbs).toEqual(200);
    expect(result.daily_fats).toEqual(60);
    expect(result.daily_fluid).toEqual(1800);
    
    expect(typeof result.daily_calories).toEqual('number');
    expect(typeof result.daily_protein).toEqual('number');
    expect(typeof result.daily_carbs).toEqual('number');
    expect(typeof result.daily_fats).toEqual('number');
    expect(typeof result.daily_fluid).toEqual('number');
  });

  it('should update values with zero', async () => {
    const userId = await createTestUser();
    const goalsId = await createTestDailyGoals(userId);

    const updateInput: UpdateDailyGoalsInput = {
      id: goalsId,
      daily_protein: 0,
      daily_carbs: 0,
      daily_fats: 0,
      daily_fluid: 0
    };

    const result = await updateDailyGoals(updateInput);

    // Verify zero values are handled correctly
    expect(result.daily_protein).toEqual(0);
    expect(result.daily_carbs).toEqual(0);
    expect(result.daily_fats).toEqual(0);
    expect(result.daily_fluid).toEqual(0);
    
    // Calories should remain unchanged
    expect(result.daily_calories).toEqual(2000);
  });

  it('should save updated goals to database', async () => {
    const userId = await createTestUser();
    const goalsId = await createTestDailyGoals(userId);

    const updateInput: UpdateDailyGoalsInput = {
      id: goalsId,
      daily_calories: 2400,
      daily_protein: 160
    };

    await updateDailyGoals(updateInput);

    // Query database directly to verify update
    const updatedGoals = await db.select()
      .from(dailyGoalsTable)
      .where(eq(dailyGoalsTable.id, goalsId))
      .execute();

    expect(updatedGoals).toHaveLength(1);
    expect(parseFloat(updatedGoals[0].daily_calories)).toEqual(2400);
    expect(parseFloat(updatedGoals[0].daily_protein)).toEqual(160);
    expect(parseFloat(updatedGoals[0].daily_carbs)).toEqual(250); // unchanged
    expect(parseFloat(updatedGoals[0].daily_fats)).toEqual(67); // unchanged
    expect(parseFloat(updatedGoals[0].daily_fluid)).toEqual(2000); // unchanged
  });

  it('should throw error for non-existent goals id', async () => {
    const updateInput: UpdateDailyGoalsInput = {
      id: 99999, // Non-existent ID
      daily_calories: 2000
    };

    await expect(updateDailyGoals(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle decimal values correctly', async () => {
    const userId = await createTestUser();
    const goalsId = await createTestDailyGoals(userId);

    const updateInput: UpdateDailyGoalsInput = {
      id: goalsId,
      daily_calories: 2250.75,
      daily_protein: 175.25,
      daily_carbs: 300.5,
      daily_fats: 80.33,
      daily_fluid: 2250.5
    };

    const result = await updateDailyGoals(updateInput);

    // Verify decimal precision is maintained
    expect(result.daily_calories).toEqual(2250.75);
    expect(result.daily_protein).toEqual(175.25);
    expect(result.daily_carbs).toEqual(300.5);
    expect(result.daily_fats).toEqual(80.33);
    expect(result.daily_fluid).toEqual(2250.5);
  });

  it('should preserve user_id and created_at from original record', async () => {
    const userId = await createTestUser();
    const goalsId = await createTestDailyGoals(userId);

    // Get original record timestamp
    const originalGoals = await db.select()
      .from(dailyGoalsTable)
      .where(eq(dailyGoalsTable.id, goalsId))
      .execute();
    
    const originalCreatedAt = originalGoals[0].created_at;

    const updateInput: UpdateDailyGoalsInput = {
      id: goalsId,
      daily_calories: 1900
    };

    const result = await updateDailyGoals(updateInput);

    // Verify preserved values
    expect(result.user_id).toEqual(userId);
    expect(result.created_at).toEqual(originalCreatedAt);
    
    // Verify updated_at is newer than created_at
    expect(result.updated_at.getTime()).toBeGreaterThan(originalCreatedAt.getTime());
  });
});