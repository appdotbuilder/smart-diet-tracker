import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, dailyGoalsTable } from '../db/schema';
import { type CreateUserInput, type CreateDailyGoalsInput } from '../schema';
import { getUserDailyGoals } from '../handlers/get_user_daily_goals';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  name: 'Test User',
  email: 'test@example.com'
};

const testGoals1: Omit<CreateDailyGoalsInput, 'user_id'> = {
  daily_calories: 2000,
  daily_protein: 150,
  daily_carbs: 250,
  daily_fats: 67,
  daily_fluid: 2500
};

const testGoals2: Omit<CreateDailyGoalsInput, 'user_id'> = {
  daily_calories: 2200,
  daily_protein: 160,
  daily_carbs: 275,
  daily_fats: 73,
  daily_fluid: 3000
};

describe('getUserDailyGoals', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent user', async () => {
    const result = await getUserDailyGoals(999);
    expect(result).toBeNull();
  });

  it('should return null for user with no goals', async () => {
    // Create user without any goals
    const userResult = await db.insert(usersTable)
      .values({
        name: testUser.name,
        email: testUser.email
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const result = await getUserDailyGoals(userId);
    expect(result).toBeNull();
  });

  it('should return latest daily goals for user', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        name: testUser.name,
        email: testUser.email
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create first set of goals
    await db.insert(dailyGoalsTable)
      .values({
        user_id: userId,
        daily_calories: testGoals1.daily_calories.toString(),
        daily_protein: testGoals1.daily_protein.toString(),
        daily_carbs: testGoals1.daily_carbs.toString(),
        daily_fats: testGoals1.daily_fats.toString(),
        daily_fluid: testGoals1.daily_fluid.toString()
      })
      .execute();

    // Wait a moment to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create second set of goals (more recent)
    await db.insert(dailyGoalsTable)
      .values({
        user_id: userId,
        daily_calories: testGoals2.daily_calories.toString(),
        daily_protein: testGoals2.daily_protein.toString(),
        daily_carbs: testGoals2.daily_carbs.toString(),
        daily_fats: testGoals2.daily_fats.toString(),
        daily_fluid: testGoals2.daily_fluid.toString()
      })
      .execute();

    const result = await getUserDailyGoals(userId);

    expect(result).not.toBeNull();
    expect(result!.user_id).toBe(userId);
    
    // Should return the latest goals (testGoals2)
    expect(result!.daily_calories).toBe(2200);
    expect(result!.daily_protein).toBe(160);
    expect(result!.daily_carbs).toBe(275);
    expect(result!.daily_fats).toBe(73);
    expect(result!.daily_fluid).toBe(3000);

    // Verify numeric types
    expect(typeof result!.daily_calories).toBe('number');
    expect(typeof result!.daily_protein).toBe('number');
    expect(typeof result!.daily_carbs).toBe('number');
    expect(typeof result!.daily_fats).toBe('number');
    expect(typeof result!.daily_fluid).toBe('number');

    // Verify timestamps
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return correct goals when multiple users exist', async () => {
    // Create first user
    const user1Result = await db.insert(usersTable)
      .values({
        name: 'User 1',
        email: 'user1@example.com'
      })
      .returning()
      .execute();

    // Create second user
    const user2Result = await db.insert(usersTable)
      .values({
        name: 'User 2',
        email: 'user2@example.com'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create goals for user 1
    await db.insert(dailyGoalsTable)
      .values({
        user_id: user1Id,
        daily_calories: testGoals1.daily_calories.toString(),
        daily_protein: testGoals1.daily_protein.toString(),
        daily_carbs: testGoals1.daily_carbs.toString(),
        daily_fats: testGoals1.daily_fats.toString(),
        daily_fluid: testGoals1.daily_fluid.toString()
      })
      .execute();

    // Create goals for user 2
    await db.insert(dailyGoalsTable)
      .values({
        user_id: user2Id,
        daily_calories: testGoals2.daily_calories.toString(),
        daily_protein: testGoals2.daily_protein.toString(),
        daily_carbs: testGoals2.daily_carbs.toString(),
        daily_fats: testGoals2.daily_fats.toString(),
        daily_fluid: testGoals2.daily_fluid.toString()
      })
      .execute();

    // Get goals for user 1
    const result1 = await getUserDailyGoals(user1Id);
    expect(result1).not.toBeNull();
    expect(result1!.user_id).toBe(user1Id);
    expect(result1!.daily_calories).toBe(2000);

    // Get goals for user 2
    const result2 = await getUserDailyGoals(user2Id);
    expect(result2).not.toBeNull();
    expect(result2!.user_id).toBe(user2Id);
    expect(result2!.daily_calories).toBe(2200);
  });

  it('should verify goals are saved correctly in database', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        name: testUser.name,
        email: testUser.email
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create goals
    await db.insert(dailyGoalsTable)
      .values({
        user_id: userId,
        daily_calories: testGoals1.daily_calories.toString(),
        daily_protein: testGoals1.daily_protein.toString(),
        daily_carbs: testGoals1.daily_carbs.toString(),
        daily_fats: testGoals1.daily_fats.toString(),
        daily_fluid: testGoals1.daily_fluid.toString()
      })
      .execute();

    const result = await getUserDailyGoals(userId);

    // Verify against database directly
    const dbGoals = await db.select()
      .from(dailyGoalsTable)
      .where(eq(dailyGoalsTable.user_id, userId))
      .execute();

    expect(dbGoals).toHaveLength(1);
    expect(result!.id).toBe(dbGoals[0].id);
    expect(result!.user_id).toBe(dbGoals[0].user_id);
    expect(result!.daily_calories).toBe(parseFloat(dbGoals[0].daily_calories));
    expect(result!.created_at).toEqual(dbGoals[0].created_at);
    expect(result!.updated_at).toEqual(dbGoals[0].updated_at);
  });
});