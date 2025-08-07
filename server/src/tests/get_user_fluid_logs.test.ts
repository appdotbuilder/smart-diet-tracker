import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, fluidLogsTable } from '../db/schema';
import { getUserFluidLogs } from '../handlers/get_user_fluid_logs';

describe('getUserFluidLogs', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no fluid logs', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const result = await getUserFluidLogs(userId);

    expect(result).toEqual([]);
  });

  it('should return all fluid logs for a user when no date filter is provided', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create fluid logs for different days
    const consumedAt1 = new Date('2024-01-15T08:30:00Z');
    const consumedAt2 = new Date('2024-01-15T14:20:00Z');
    const consumedAt3 = new Date('2024-01-16T09:15:00Z');

    await db.insert(fluidLogsTable)
      .values([
        {
          user_id: userId,
          fluid_type: 'Water',
          volume: '250.00',
          consumed_at: consumedAt1
        },
        {
          user_id: userId,
          fluid_type: 'Coffee',
          volume: '150.00',
          consumed_at: consumedAt2
        },
        {
          user_id: userId,
          fluid_type: 'Tea',
          volume: '200.00',
          consumed_at: consumedAt3
        }
      ])
      .execute();

    const result = await getUserFluidLogs(userId);

    expect(result).toHaveLength(3);
    
    // Results should be ordered by consumed_at descending (most recent first)
    expect(result[0].fluid_type).toEqual('Tea');
    expect(result[0].volume).toEqual(200);
    expect(typeof result[0].volume).toBe('number');
    expect(result[0].consumed_at).toEqual(consumedAt3);

    expect(result[1].fluid_type).toEqual('Coffee');
    expect(result[1].volume).toEqual(150);
    expect(result[1].consumed_at).toEqual(consumedAt2);

    expect(result[2].fluid_type).toEqual('Water');
    expect(result[2].volume).toEqual(250);
    expect(result[2].consumed_at).toEqual(consumedAt1);

    // Verify all have correct user_id
    result.forEach(log => {
      expect(log.user_id).toEqual(userId);
      expect(log.id).toBeDefined();
      expect(log.created_at).toBeInstanceOf(Date);
    });
  });

  it('should filter fluid logs by specific date', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create fluid logs for different days
    const targetDate = '2024-01-15';
    const consumedAt1 = new Date('2024-01-15T08:30:00Z');
    const consumedAt2 = new Date('2024-01-15T14:20:00Z');
    const consumedAt3 = new Date('2024-01-16T09:15:00Z'); // Different day

    await db.insert(fluidLogsTable)
      .values([
        {
          user_id: userId,
          fluid_type: 'Water',
          volume: '250.00',
          consumed_at: consumedAt1
        },
        {
          user_id: userId,
          fluid_type: 'Coffee',
          volume: '150.00',
          consumed_at: consumedAt2
        },
        {
          user_id: userId,
          fluid_type: 'Tea',
          volume: '200.00',
          consumed_at: consumedAt3
        }
      ])
      .execute();

    const result = await getUserFluidLogs(userId, targetDate);

    // Should only return logs from the specified date
    expect(result).toHaveLength(2);
    
    // Results should be ordered by consumed_at descending
    expect(result[0].fluid_type).toEqual('Coffee');
    expect(result[0].volume).toEqual(150);
    expect(result[0].consumed_at).toEqual(consumedAt2);

    expect(result[1].fluid_type).toEqual('Water');
    expect(result[1].volume).toEqual(250);
    expect(result[1].consumed_at).toEqual(consumedAt1);

    // Should not include the log from the different day
    expect(result.find(log => log.fluid_type === 'Tea')).toBeUndefined();
  });

  it('should only return logs for the specified user', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values({
        name: 'User 1',
        email: 'user1@example.com'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        name: 'User 2',
        email: 'user2@example.com'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    const consumedAt = new Date('2024-01-15T10:30:00Z');

    // Create fluid logs for both users
    await db.insert(fluidLogsTable)
      .values([
        {
          user_id: user1Id,
          fluid_type: 'Water',
          volume: '250.00',
          consumed_at: consumedAt
        },
        {
          user_id: user2Id,
          fluid_type: 'Coffee',
          volume: '150.00',
          consumed_at: consumedAt
        }
      ])
      .execute();

    // Get logs for user 1
    const user1Logs = await getUserFluidLogs(user1Id);
    expect(user1Logs).toHaveLength(1);
    expect(user1Logs[0].fluid_type).toEqual('Water');
    expect(user1Logs[0].user_id).toEqual(user1Id);

    // Get logs for user 2
    const user2Logs = await getUserFluidLogs(user2Id);
    expect(user2Logs).toHaveLength(1);
    expect(user2Logs[0].fluid_type).toEqual('Coffee');
    expect(user2Logs[0].user_id).toEqual(user2Id);
  });

  it('should handle edge cases with date boundaries correctly', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create logs at the boundaries of a day
    const targetDate = '2024-01-15';
    const startOfDay = new Date('2024-01-15T00:00:00Z');
    const lateInDay = new Date('2024-01-15T22:30:00Z'); // Earlier time to avoid edge case issues
    const nextDayStart = new Date('2024-01-16T00:00:00Z');

    await db.insert(fluidLogsTable)
      .values([
        {
          user_id: userId,
          fluid_type: 'Early Water',
          volume: '100.00',
          consumed_at: startOfDay
        },
        {
          user_id: userId,
          fluid_type: 'Late Water',
          volume: '200.00',
          consumed_at: lateInDay
        },
        {
          user_id: userId,
          fluid_type: 'Next Day Water',
          volume: '300.00',
          consumed_at: nextDayStart
        }
      ])
      .execute();

    const result = await getUserFluidLogs(userId, targetDate);

    // Should include both boundary logs from the target date
    expect(result).toHaveLength(2);
    
    const fluidTypes = result.map(log => log.fluid_type);
    expect(fluidTypes).toContain('Early Water');
    expect(fluidTypes).toContain('Late Water');
    expect(fluidTypes).not.toContain('Next Day Water');
  });

  it('should return empty array when filtering by date with no matching logs', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a log for a different date
    await db.insert(fluidLogsTable)
      .values({
        user_id: userId,
        fluid_type: 'Water',
        volume: '250.00',
        consumed_at: new Date('2024-01-15T10:30:00Z')
      })
      .execute();

    // Query for a different date
    const result = await getUserFluidLogs(userId, '2024-01-16');

    expect(result).toEqual([]);
  });

  it('should properly convert numeric volume values', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a fluid log with decimal volume
    await db.insert(fluidLogsTable)
      .values({
        user_id: userId,
        fluid_type: 'Water',
        volume: '250.50',
        consumed_at: new Date('2024-01-15T10:30:00Z')
      })
      .execute();

    const result = await getUserFluidLogs(userId);

    expect(result).toHaveLength(1);
    expect(result[0].volume).toEqual(250.5);
    expect(typeof result[0].volume).toBe('number');
  });
});