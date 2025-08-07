import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, fluidLogsTable, dailySummariesTable } from '../db/schema';
import { deleteFluidLog } from '../handlers/delete_fluid_log';
import { eq, and } from 'drizzle-orm';

describe('deleteFluidLog', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a fluid log and update daily summary', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create fluid log
    const fluidLogResult = await db.insert(fluidLogsTable)
      .values({
        user_id: userId,
        fluid_type: 'Water',
        volume: '500.00', // 500ml
        consumed_at: new Date('2024-01-15T10:00:00Z')
      })
      .returning()
      .execute();
    const logId = fluidLogResult[0].id;

    // Create daily summary
    await db.insert(dailySummariesTable)
      .values({
        user_id: userId,
        summary_date: '2024-01-15',
        total_calories: '0.00',
        total_protein: '0.00',
        total_carbs: '0.00',
        total_fats: '0.00',
        total_fluid: '1000.00' // 1000ml total
      })
      .execute();

    // Delete the fluid log
    const result = await deleteFluidLog(logId, userId);

    // Should return true
    expect(result).toBe(true);

    // Verify fluid log is deleted
    const remainingLogs = await db.select()
      .from(fluidLogsTable)
      .where(eq(fluidLogsTable.id, logId))
      .execute();
    expect(remainingLogs).toHaveLength(0);

    // Verify daily summary is updated
    const updatedSummaries = await db.select()
      .from(dailySummariesTable)
      .where(and(
        eq(dailySummariesTable.user_id, userId),
        eq(dailySummariesTable.summary_date, '2024-01-15')
      ))
      .execute();
    
    expect(updatedSummaries).toHaveLength(1);
    expect(parseFloat(updatedSummaries[0].total_fluid)).toBe(500.00); // 1000 - 500 = 500
  });

  it('should return false if fluid log does not exist', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Try to delete non-existent log
    const result = await deleteFluidLog(999, userId);

    // Should return false
    expect(result).toBe(false);
  });

  it('should return false if fluid log belongs to different user', async () => {
    // Create first user
    const user1Result = await db.insert(usersTable)
      .values({
        name: 'User 1',
        email: 'user1@example.com'
      })
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    // Create second user
    const user2Result = await db.insert(usersTable)
      .values({
        name: 'User 2',
        email: 'user2@example.com'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create fluid log for user 1
    const fluidLogResult = await db.insert(fluidLogsTable)
      .values({
        user_id: user1Id,
        fluid_type: 'Coffee',
        volume: '250.00',
        consumed_at: new Date('2024-01-15T08:00:00Z')
      })
      .returning()
      .execute();
    const logId = fluidLogResult[0].id;

    // Try to delete with user 2's ID
    const result = await deleteFluidLog(logId, user2Id);

    // Should return false
    expect(result).toBe(false);

    // Verify fluid log still exists
    const remainingLogs = await db.select()
      .from(fluidLogsTable)
      .where(eq(fluidLogsTable.id, logId))
      .execute();
    expect(remainingLogs).toHaveLength(1);
  });

  it('should handle deletion when no daily summary exists', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create fluid log without daily summary
    const fluidLogResult = await db.insert(fluidLogsTable)
      .values({
        user_id: userId,
        fluid_type: 'Tea',
        volume: '300.00',
        consumed_at: new Date('2024-01-15T15:00:00Z')
      })
      .returning()
      .execute();
    const logId = fluidLogResult[0].id;

    // Delete the fluid log
    const result = await deleteFluidLog(logId, userId);

    // Should return true even without daily summary
    expect(result).toBe(true);

    // Verify fluid log is deleted
    const remainingLogs = await db.select()
      .from(fluidLogsTable)
      .where(eq(fluidLogsTable.id, logId))
      .execute();
    expect(remainingLogs).toHaveLength(0);
  });

  it('should prevent negative fluid totals in daily summary', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create fluid log
    const fluidLogResult = await db.insert(fluidLogsTable)
      .values({
        user_id: userId,
        fluid_type: 'Water',
        volume: '800.00', // 800ml - more than current total
        consumed_at: new Date('2024-01-15T12:00:00Z')
      })
      .returning()
      .execute();
    const logId = fluidLogResult[0].id;

    // Create daily summary with less fluid than the log
    await db.insert(dailySummariesTable)
      .values({
        user_id: userId,
        summary_date: '2024-01-15',
        total_calories: '0.00',
        total_protein: '0.00',
        total_carbs: '0.00',
        total_fats: '0.00',
        total_fluid: '500.00' // Only 500ml total
      })
      .execute();

    // Delete the fluid log
    const result = await deleteFluidLog(logId, userId);

    // Should return true
    expect(result).toBe(true);

    // Verify daily summary is updated to 0, not negative
    const updatedSummaries = await db.select()
      .from(dailySummariesTable)
      .where(and(
        eq(dailySummariesTable.user_id, userId),
        eq(dailySummariesTable.summary_date, '2024-01-15')
      ))
      .execute();
    
    expect(updatedSummaries).toHaveLength(1);
    expect(parseFloat(updatedSummaries[0].total_fluid)).toBe(0.00); // Clamped to 0
  });

  it('should handle multiple fluid logs for same day correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create multiple fluid logs for same day
    const log1Result = await db.insert(fluidLogsTable)
      .values({
        user_id: userId,
        fluid_type: 'Water',
        volume: '400.00',
        consumed_at: new Date('2024-01-15T09:00:00Z')
      })
      .returning()
      .execute();

    const log2Result = await db.insert(fluidLogsTable)
      .values({
        user_id: userId,
        fluid_type: 'Coffee',
        volume: '200.00',
        consumed_at: new Date('2024-01-15T14:00:00Z')
      })
      .returning()
      .execute();

    // Create daily summary
    await db.insert(dailySummariesTable)
      .values({
        user_id: userId,
        summary_date: '2024-01-15',
        total_calories: '0.00',
        total_protein: '0.00',
        total_carbs: '0.00',
        total_fats: '0.00',
        total_fluid: '600.00' // Total of both logs
      })
      .execute();

    // Delete first log only
    const result = await deleteFluidLog(log1Result[0].id, userId);

    // Should return true
    expect(result).toBe(true);

    // Verify only first log is deleted
    const remainingLogs = await db.select()
      .from(fluidLogsTable)
      .where(eq(fluidLogsTable.user_id, userId))
      .execute();
    expect(remainingLogs).toHaveLength(1);
    expect(remainingLogs[0].id).toBe(log2Result[0].id);

    // Verify daily summary is updated correctly
    const updatedSummaries = await db.select()
      .from(dailySummariesTable)
      .where(and(
        eq(dailySummariesTable.user_id, userId),
        eq(dailySummariesTable.summary_date, '2024-01-15')
      ))
      .execute();
    
    expect(updatedSummaries).toHaveLength(1);
    expect(parseFloat(updatedSummaries[0].total_fluid)).toBe(200.00); // 600 - 400 = 200
  });
});