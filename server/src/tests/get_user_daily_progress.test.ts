import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  dailyGoalsTable, 
  dailySummariesTable, 
  foodLogsTable, 
  fluidLogsTable,
  foodItemsTable 
} from '../db/schema';
import { type GetUserDailyProgressInput } from '../schema';
import { getUserDailyProgress } from '../handlers/get_user_daily_progress';

// Test data
const testUser = {
  name: 'Test User',
  email: 'test@example.com'
};

const testGoals = {
  user_id: 1,
  daily_calories: '2000',
  daily_protein: '150',
  daily_carbs: '250',
  daily_fats: '67',
  daily_fluid: '2000'
};

const testFoodItem = {
  name: 'Test Food',
  calories_per_100g: '200',
  protein_per_100g: '20',
  carbs_per_100g: '30',
  fats_per_100g: '10'
};

const testSummary = {
  user_id: 1,
  summary_date: '2024-01-15',
  total_calories: '1500',
  total_protein: '100',
  total_carbs: '200',
  total_fats: '50',
  total_fluid: '1800'
};

const testInput: GetUserDailyProgressInput = {
  user_id: 1,
  date: '2024-01-15'
};

describe('getUserDailyProgress', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return complete daily progress with all data', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(foodItemsTable).values(testFoodItem).execute();
    await db.insert(dailyGoalsTable).values(testGoals).execute();
    await db.insert(dailySummariesTable).values(testSummary).execute();

    await db.insert(foodLogsTable).values({
      user_id: 1,
      food_item_id: 1,
      portion_size: '150.5',
      consumed_at: new Date('2024-01-15T10:30:00.000Z')
    }).execute();

    await db.insert(fluidLogsTable).values({
      user_id: 1,
      fluid_type: 'Water',
      volume: '500.0',
      consumed_at: new Date('2024-01-15T14:15:00.000Z')
    }).execute();

    const result = await getUserDailyProgress(testInput);

    // Verify basic structure
    expect(result.date).toEqual('2024-01-15');

    // Verify goals
    expect(result.goals).toBeDefined();
    expect(result.goals!.user_id).toEqual(1);
    expect(result.goals!.daily_calories).toEqual(2000);
    expect(result.goals!.daily_protein).toEqual(150);
    expect(result.goals!.daily_carbs).toEqual(250);
    expect(result.goals!.daily_fats).toEqual(67);
    expect(result.goals!.daily_fluid).toEqual(2000);

    // Verify summary
    expect(result.summary).toBeDefined();
    expect(result.summary!.user_id).toEqual(1);
    expect(result.summary!.total_calories).toEqual(1500);
    expect(result.summary!.total_protein).toEqual(100);
    expect(result.summary!.total_carbs).toEqual(200);
    expect(result.summary!.total_fats).toEqual(50);
    expect(result.summary!.total_fluid).toEqual(1800);

    // Verify food logs
    expect(result.food_logs).toHaveLength(1);
    expect(result.food_logs[0].user_id).toEqual(1);
    expect(result.food_logs[0].food_item_id).toEqual(1);
    expect(result.food_logs[0].portion_size).toEqual(150.5);

    // Verify fluid logs
    expect(result.fluid_logs).toHaveLength(1);
    expect(result.fluid_logs[0].user_id).toEqual(1);
    expect(result.fluid_logs[0].fluid_type).toEqual('Water');
    expect(result.fluid_logs[0].volume).toEqual(500);

    // Verify progress percentages
    expect(result.progress_percentages.calories).toEqual(75); // 1500/2000 = 75%
    expect(result.progress_percentages.protein).toEqual(67); // 100/150 = 66.67% rounded to 67%
    expect(result.progress_percentages.carbs).toEqual(80); // 200/250 = 80%
    expect(result.progress_percentages.fats).toEqual(75); // 50/67 = 74.63% rounded to 75%
    expect(result.progress_percentages.fluid).toEqual(90); // 1800/2000 = 90%
  });

  it('should handle user with no goals', async () => {
    // Create user but no goals
    await db.insert(usersTable).values(testUser).execute();

    const result = await getUserDailyProgress(testInput);

    expect(result.date).toEqual('2024-01-15');
    expect(result.goals).toBeNull();
    expect(result.summary).toBeNull();
    expect(result.food_logs).toHaveLength(0);
    expect(result.fluid_logs).toHaveLength(0);
    expect(result.progress_percentages.calories).toEqual(0);
    expect(result.progress_percentages.protein).toEqual(0);
    expect(result.progress_percentages.carbs).toEqual(0);
    expect(result.progress_percentages.fats).toEqual(0);
    expect(result.progress_percentages.fluid).toEqual(0);
  });

  it('should handle date with no logs or summary', async () => {
    // Create user and goals but no summary or logs for the date
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(dailyGoalsTable).values(testGoals).execute();

    const result = await getUserDailyProgress(testInput);

    expect(result.date).toEqual('2024-01-15');
    expect(result.goals).toBeDefined();
    expect(result.goals!.daily_calories).toEqual(2000);
    expect(result.summary).toBeNull();
    expect(result.food_logs).toHaveLength(0);
    expect(result.fluid_logs).toHaveLength(0);
    expect(result.progress_percentages.calories).toEqual(0);
    expect(result.progress_percentages.protein).toEqual(0);
    expect(result.progress_percentages.carbs).toEqual(0);
    expect(result.progress_percentages.fats).toEqual(0);
    expect(result.progress_percentages.fluid).toEqual(0);
  });

  it('should return most recent goals when multiple exist', async () => {
    // Create user
    await db.insert(usersTable).values(testUser).execute();
    
    // Create older goals
    await db.insert(dailyGoalsTable).values({
      user_id: 1,
      daily_calories: '1800',
      daily_protein: '120',
      daily_carbs: '200',
      daily_fats: '60',
      daily_fluid: '1800',
      created_at: new Date('2024-01-10T10:00:00Z'),
      updated_at: new Date('2024-01-10T10:00:00Z')
    }).execute();

    // Create newer goals (higher updated_at should be returned)
    await db.insert(dailyGoalsTable).values({
      user_id: 1,
      daily_calories: '2200',
      daily_protein: '160',
      daily_carbs: '270',
      daily_fats: '70',
      daily_fluid: '2200',
      created_at: new Date('2024-01-12T10:00:00Z'),
      updated_at: new Date('2024-01-12T10:00:00Z')
    }).execute();

    const result = await getUserDailyProgress(testInput);

    // Should return the more recent goals (higher updated_at)
    expect(result.goals).toBeDefined();
    expect(result.goals!.daily_calories).toEqual(2200);
    expect(result.goals!.daily_protein).toEqual(160);
    expect(result.goals!.daily_carbs).toEqual(270);
    expect(result.goals!.daily_fats).toEqual(70);
    expect(result.goals!.daily_fluid).toEqual(2200);
  });

  it('should handle numeric conversions correctly', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(foodItemsTable).values({
      name: 'Test Food',
      calories_per_100g: '200.50',
      protein_per_100g: '20.25',
      carbs_per_100g: '30.75',
      fats_per_100g: '10.33'
    }).execute();
    
    await db.insert(dailyGoalsTable).values({
      user_id: 1,
      daily_calories: '2000.50',
      daily_protein: '150.25',
      daily_carbs: '250.75',
      daily_fats: '67.33',
      daily_fluid: '2000.00'
    }).execute();

    await db.insert(dailySummariesTable).values({
      user_id: 1,
      summary_date: '2024-01-15',
      total_calories: '1500.75',
      total_protein: '100.50',
      total_carbs: '200.25',
      total_fats: '50.10',
      total_fluid: '1800.00'
    }).execute();

    await db.insert(foodLogsTable).values({
      user_id: 1,
      food_item_id: 1,
      portion_size: '150.75',
      consumed_at: new Date('2024-01-15T12:00:00.000Z')
    }).execute();

    await db.insert(fluidLogsTable).values({
      user_id: 1,
      fluid_type: 'Water',
      volume: '500.50',
      consumed_at: new Date('2024-01-15T15:00:00.000Z')
    }).execute();

    const result = await getUserDailyProgress(testInput);

    // Verify numeric types are correct
    expect(typeof result.goals!.daily_calories).toBe('number');
    expect(result.goals!.daily_calories).toEqual(2000.50);
    expect(typeof result.summary!.total_calories).toBe('number');
    expect(result.summary!.total_calories).toEqual(1500.75);
    expect(typeof result.food_logs[0].portion_size).toBe('number');
    expect(result.food_logs[0].portion_size).toEqual(150.75);
    expect(typeof result.fluid_logs[0].volume).toBe('number');
    expect(result.fluid_logs[0].volume).toEqual(500.50);
  });

  it('should filter logs by exact date', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(foodItemsTable).values(testFoodItem).execute();
    await db.insert(dailyGoalsTable).values(testGoals).execute();

    // Create logs for different dates
    await db.insert(foodLogsTable).values([
      {
        user_id: 1,
        food_item_id: 1,
        portion_size: '100',
        consumed_at: new Date('2024-01-14T10:00:00.000Z') // Different date
      },
      {
        user_id: 1,
        food_item_id: 1,
        portion_size: '200',
        consumed_at: new Date('2024-01-15T10:00:00.000Z') // Target date
      },
      {
        user_id: 1,
        food_item_id: 1,
        portion_size: '300',
        consumed_at: new Date('2024-01-16T10:00:00.000Z') // Different date
      }
    ]).execute();

    await db.insert(fluidLogsTable).values([
      {
        user_id: 1,
        fluid_type: 'Coffee',
        volume: '250',
        consumed_at: new Date('2024-01-14T08:00:00.000Z') // Different date
      },
      {
        user_id: 1,
        fluid_type: 'Water',
        volume: '500',
        consumed_at: new Date('2024-01-15T12:00:00.000Z') // Target date
      }
    ]).execute();

    const result = await getUserDailyProgress(testInput);

    // Should only return logs from the target date
    expect(result.food_logs).toHaveLength(1);
    expect(result.food_logs[0].portion_size).toEqual(200);
    expect(result.fluid_logs).toHaveLength(1);
    expect(result.fluid_logs[0].volume).toEqual(500);
    expect(result.fluid_logs[0].fluid_type).toEqual('Water');
  });

  it('should handle logs at different times within the same date', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(foodItemsTable).values(testFoodItem).execute();
    await db.insert(dailyGoalsTable).values(testGoals).execute();

    // Create multiple logs within the same date
    await db.insert(foodLogsTable).values([
      {
        user_id: 1,
        food_item_id: 1,
        portion_size: '100',
        consumed_at: new Date('2024-01-15T06:00:00.000Z') // Early morning
      },
      {
        user_id: 1,
        food_item_id: 1,
        portion_size: '150',
        consumed_at: new Date('2024-01-15T12:30:00.000Z') // Noon
      },
      {
        user_id: 1,
        food_item_id: 1,
        portion_size: '200',
        consumed_at: new Date('2024-01-15T19:45:00.000Z') // Evening
      }
    ]).execute();

    await db.insert(fluidLogsTable).values([
      {
        user_id: 1,
        fluid_type: 'Water',
        volume: '250',
        consumed_at: new Date('2024-01-15T08:00:00.000Z') // Morning
      },
      {
        user_id: 1,
        fluid_type: 'Coffee',
        volume: '200',
        consumed_at: new Date('2024-01-15T16:30:00.000Z') // Afternoon
      }
    ]).execute();

    const result = await getUserDailyProgress(testInput);

    // Should return all logs from the target date
    expect(result.food_logs).toHaveLength(3);
    expect(result.food_logs.map(log => log.portion_size).sort()).toEqual([100, 150, 200]);
    expect(result.fluid_logs).toHaveLength(2);
    expect(result.fluid_logs.map(log => log.volume).sort()).toEqual([200, 250]);
  });
});