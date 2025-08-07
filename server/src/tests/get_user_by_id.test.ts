import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUserById } from '../handlers/get_user_by_id';

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when user exists', async () => {
    // Create a test user
    const testUser = {
      name: 'John Doe',
      email: 'john.doe@example.com'
    };

    const insertResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Test the handler
    const result = await getUserById(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.name).toEqual('John Doe');
    expect(result!.email).toEqual('john.doe@example.com');
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null when user does not exist', async () => {
    const result = await getUserById(999);

    expect(result).toBeNull();
  });

  it('should handle multiple users and return correct one', async () => {
    // Create multiple test users
    const users = [
      { name: 'Alice Smith', email: 'alice@example.com' },
      { name: 'Bob Johnson', email: 'bob@example.com' },
      { name: 'Carol Wilson', email: 'carol@example.com' }
    ];

    const insertResults = await db.insert(usersTable)
      .values(users)
      .returning()
      .execute();

    // Get the middle user
    const targetUser = insertResults[1];
    const result = await getUserById(targetUser.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(targetUser.id);
    expect(result!.name).toEqual('Bob Johnson');
    expect(result!.email).toEqual('bob@example.com');
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should handle zero and negative user IDs gracefully', async () => {
    const resultZero = await getUserById(0);
    const resultNegative = await getUserById(-1);

    expect(resultZero).toBeNull();
    expect(resultNegative).toBeNull();
  });

  it('should return user with all required fields populated', async () => {
    const testUser = {
      name: 'Test User',
      email: 'test@example.com'
    };

    const insertResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createdUser = insertResult[0];
    const result = await getUserById(createdUser.id);

    expect(result).not.toBeNull();
    
    // Verify all required fields are present
    expect(typeof result!.id).toBe('number');
    expect(typeof result!.name).toBe('string');
    expect(typeof result!.email).toBe('string');
    expect(result!.created_at).toBeInstanceOf(Date);
    
    // Verify field values
    expect(result!.id).toBeGreaterThan(0);
    expect(result!.name.length).toBeGreaterThan(0);
    expect(result!.email).toContain('@');
  });
});