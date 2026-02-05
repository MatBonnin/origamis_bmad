import { PrismaClient } from '@prisma/client';

describe('Password Reset Schema', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('users table password reset fields', () => {
    it('should have password_reset_token_hash field', async () => {
      // This test validates that the schema has been migrated correctly
      // by attempting to query the field - if it doesn't exist, the query will fail
      const fields = await prisma.$queryRaw<{ column_name: string }[]>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'password_reset_token_hash'
      `;
      expect(fields.length).toBe(1);
    });

    it('should have password_reset_expires_at field', async () => {
      const fields = await prisma.$queryRaw<{ column_name: string }[]>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'password_reset_expires_at'
      `;
      expect(fields.length).toBe(1);
    });

    it('should have password_reset_used_at field', async () => {
      const fields = await prisma.$queryRaw<{ column_name: string }[]>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'password_reset_used_at'
      `;
      expect(fields.length).toBe(1);
    });
  });

  describe('password reset field types and constraints', () => {
    it('should allow null values for password_reset_token_hash (optional field)', async () => {
      const result = await prisma.$queryRaw<{ is_nullable: string }[]>`
        SELECT is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'password_reset_token_hash'
      `;
      expect(result[0]?.is_nullable).toBe('YES');
    });

    it('should allow null values for password_reset_expires_at (optional field)', async () => {
      const result = await prisma.$queryRaw<{ is_nullable: string }[]>`
        SELECT is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'password_reset_expires_at'
      `;
      expect(result[0]?.is_nullable).toBe('YES');
    });

    it('should allow null values for password_reset_used_at (optional field)', async () => {
      const result = await prisma.$queryRaw<{ is_nullable: string }[]>`
        SELECT is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'password_reset_used_at'
      `;
      expect(result[0]?.is_nullable).toBe('YES');
    });
  });
});
