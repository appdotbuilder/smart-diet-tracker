import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input
const testInput: CreateUserInput = {
  name: 'John Doe',
  email: 'john@example.com'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.name).toEqual('John Doe');
    expect(result.email).toEqual('john@example.com');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].name).toEqual('John Doe');
    expect(users[0].email).toEqual('john@example.com');
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should reject duplicate email addresses', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same email
    const duplicateInput: CreateUserInput = {
      name: 'Jane Doe',
      email: 'john@example.com' // Same email
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should handle different email formats', async () => {
    const testCases = [
      { name: 'User 1', email: 'user1@test.co.uk' },
      { name: 'User 2', email: 'user2+tag@example.org' },
      { name: 'User 3', email: 'user.name@sub.domain.com' }
    ];

    for (const testCase of testCases) {
      const result = await createUser(testCase);
      expect(result.name).toEqual(testCase.name);
      expect(result.email).toEqual(testCase.email);
      expect(result.id).toBeDefined();
    }

    // Verify all users were created
    const allUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(allUsers).toHaveLength(3);
  });

  it('should preserve exact name formatting', async () => {
    const nameTestCases = [
      'John Smith',
      'Mary-Jane Watson',
      'José García',
      'Li Wei',
      'O\'Connor'
    ];

    for (const name of nameTestCases) {
      const input: CreateUserInput = {
        name,
        email: `${name.toLowerCase().replace(/[^a-z]/g, '')}@test.com`
      };

      const result = await createUser(input);
      expect(result.name).toEqual(name);
    }
  });
});