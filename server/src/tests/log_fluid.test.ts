import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, fluidLogsTable, dailySummariesTable } from '../db/schema';
import { type LogFluidInput } from '../schema';
import { logFluid } from '../handlers/log_fluid';
import { eq, and } from 'drizzle-orm';

describe('logFluid', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should log fluid consumption for a valid user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    const testInput: LogFluidInput = {
      user_id: userId,
      fluid_type: 'Water',
      volume: 500,
      consumed_at: new Date('2024-01-15T10:30:00Z')
    };

    const result = await logFluid(testInput);

    // Verify returned fluid log
    expect(result.user_id).toEqual(userId);
    expect(result.fluid_type).toEqual('Water');
    expect(result.volume).toEqual(500);
    expect(typeof result.volume).toBe('number');
    expect(result.consumed_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.id).toBeDefined();
  });

  it('should save fluid log to database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    const testInput: LogFluidInput = {
      user_id: userId,
      fluid_type: 'Coffee',
      volume: 250
    };

    const result = await logFluid(testInput);

    // Query database to verify storage
    const fluidLogs = await db.select()
      .from(fluidLogsTable)
      .where(eq(fluidLogsTable.id, result.id))
      .execute();

    expect(fluidLogs).toHaveLength(1);
    expect(fluidLogs[0].user_id).toEqual(userId);
    expect(fluidLogs[0].fluid_type).toEqual('Coffee');
    expect(parseFloat(fluidLogs[0].volume)).toEqual(250);
    expect(fluidLogs[0].consumed_at).toBeInstanceOf(Date);
    expect(fluidLogs[0].created_at).toBeInstanceOf(Date);
  });

  it('should use current time when consumed_at is not provided', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    const beforeLog = new Date();

    const testInput: LogFluidInput = {
      user_id: userId,
      fluid_type: 'Tea',
      volume: 300
    };

    const result = await logFluid(testInput);

    const afterLog = new Date();

    expect(result.consumed_at.getTime()).toBeGreaterThanOrEqual(beforeLog.getTime());
    expect(result.consumed_at.getTime()).toBeLessThanOrEqual(afterLog.getTime());
  });

  it('should create new daily summary when none exists', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    const testInput: LogFluidInput = {
      user_id: userId,
      fluid_type: 'Water',
      volume: 400,
      consumed_at: new Date('2024-01-15T14:00:00Z')
    };

    await logFluid(testInput);

    // Check daily summary was created
    const summaries = await db.select()
      .from(dailySummariesTable)
      .where(and(
        eq(dailySummariesTable.user_id, userId),
        eq(dailySummariesTable.summary_date, '2024-01-15')
      ))
      .execute();

    expect(summaries).toHaveLength(1);
    expect(parseFloat(summaries[0].total_fluid)).toEqual(400);
    expect(parseFloat(summaries[0].total_calories)).toEqual(0);
    expect(parseFloat(summaries[0].total_protein)).toEqual(0);
    expect(parseFloat(summaries[0].total_carbs)).toEqual(0);
    expect(parseFloat(summaries[0].total_fats)).toEqual(0);
  });

  it('should update existing daily summary when one exists', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create existing daily summary
    await db.insert(dailySummariesTable)
      .values({
        user_id: userId,
        summary_date: '2024-01-15',
        total_calories: '1500',
        total_protein: '100',
        total_carbs: '200',
        total_fats: '50',
        total_fluid: '800'
      })
      .execute();

    const testInput: LogFluidInput = {
      user_id: userId,
      fluid_type: 'Juice',
      volume: 300,
      consumed_at: new Date('2024-01-15T16:00:00Z')
    };

    await logFluid(testInput);

    // Check daily summary was updated
    const summaries = await db.select()
      .from(dailySummariesTable)
      .where(and(
        eq(dailySummariesTable.user_id, userId),
        eq(dailySummariesTable.summary_date, '2024-01-15')
      ))
      .execute();

    expect(summaries).toHaveLength(1);
    expect(parseFloat(summaries[0].total_fluid)).toEqual(1100); // 800 + 300
    // Other values should remain unchanged
    expect(parseFloat(summaries[0].total_calories)).toEqual(1500);
    expect(parseFloat(summaries[0].total_protein)).toEqual(100);
    expect(summaries[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle multiple fluid logs for the same user and date', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    const consumedAt = new Date('2024-01-15T10:00:00Z');

    // Log multiple fluids
    await logFluid({
      user_id: userId,
      fluid_type: 'Water',
      volume: 250,
      consumed_at: consumedAt
    });

    await logFluid({
      user_id: userId,
      fluid_type: 'Coffee',
      volume: 200,
      consumed_at: consumedAt
    });

    await logFluid({
      user_id: userId,
      fluid_type: 'Tea',
      volume: 150,
      consumed_at: consumedAt
    });

    // Check all fluid logs exist
    const fluidLogs = await db.select()
      .from(fluidLogsTable)
      .where(eq(fluidLogsTable.user_id, userId))
      .execute();

    expect(fluidLogs).toHaveLength(3);

    // Check daily summary reflects total
    const summaries = await db.select()
      .from(dailySummariesTable)
      .where(and(
        eq(dailySummariesTable.user_id, userId),
        eq(dailySummariesTable.summary_date, '2024-01-15')
      ))
      .execute();

    expect(summaries).toHaveLength(1);
    expect(parseFloat(summaries[0].total_fluid)).toEqual(600); // 250 + 200 + 150
  });

  it('should throw error when user does not exist', async () => {
    const testInput: LogFluidInput = {
      user_id: 999,
      fluid_type: 'Water',
      volume: 500
    };

    await expect(logFluid(testInput)).rejects.toThrow(/User with id 999 not found/i);
  });

  it('should handle different fluid types correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    const fluidTypes = ['Water', 'Coffee', 'Tea', 'Juice', 'Soda', 'Milk'];
    
    for (const fluidType of fluidTypes) {
      const result = await logFluid({
        user_id: userId,
        fluid_type: fluidType,
        volume: 200
      });

      expect(result.fluid_type).toEqual(fluidType);
      expect(result.volume).toEqual(200);
    }

    // Verify all logs were created
    const fluidLogs = await db.select()
      .from(fluidLogsTable)
      .where(eq(fluidLogsTable.user_id, userId))
      .execute();

    expect(fluidLogs).toHaveLength(fluidTypes.length);
  });
});