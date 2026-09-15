import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import pg from 'pg';

import {
  createUser,
  findUserById,
  findUserByEmail,
  allowAuthAttempt,
} from '../src/utils/users.server.ts';
import { hashPassword, verifyPassword } from '../src/utils/password.server.ts';

test(
  'PostgreSQL registration, duplicate races, login, current user and rate limits',
  {
    // Skip this integration test when no test database is configured.
    skip: !process.env.TEST_DATABASE_URL,
  },
  async () => {
    // Give each test run its own PostgreSQL schema so it cannot interfere
    // with application tables or concurrent test runs.
    const schema = `auth_test_${randomUUID().replaceAll('-', '')}`;

    // Keep one direct connection for creating/dropping the isolated schema.
    const admin = new pg.Client({
      connectionString: process.env.TEST_DATABASE_URL,
    });
    await admin.connect();

    // Application queries use a normal pool, similar to production.
    const connections = new pg.Pool({
      connectionString: process.env.TEST_DATABASE_URL,
    });

    // Wrap every query in its own transaction and point search_path at the
    // temporary schema. SET LOCAL is scoped to the transaction, which also
    // makes this compatible with hosted transaction poolers.
    const pool = {
      async query(sql, values) {
        const client = await connections.connect();

        try {
          // Start a transaction so we can temporarily change PostgreSQL's search_path
          // for just this query.
          await client.query('BEGIN');

          // Make unqualified table names such as "users" resolve to this test's
          // temporary schema instead of the connection's default schema.
          // Using SET LOCAL prevents this setting from leaking when the pooled
          // connection is later reused by another query.
          await client.query(`SET LOCAL search_path TO "${schema}"`);

          // Execute the application query while the temporary test schema is active.
          const result = await client.query(sql, values);

          // Commit the transaction. This also ends the scope of SET LOCAL,
          // so the connection returns to its normal search_path before being reused.
          await client.query('COMMIT');

          return result;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      },
    };

    // The user utilities read their database connection from this global.
    globalThis.appDatabase = pool;

    try {
      // Build an isolated copy of the users/auth tables from the real migration.
      await admin.query(`CREATE SCHEMA "${schema}"`);
      await pool.query(
        await readFile(
          new URL('../db/migrations/001_users.sql', import.meta.url),
          'utf8',
        ),
      );

      const passwordHash = await hashPassword('test-password');

      const input = {
        name: 'Test User',

        // Deliberately include whitespace and mixed case to verify that
        // registration normalizes email addresses.
        email: ' Test@Example.com ',
        passwordHash,
      };

      // Simulate two simultaneous registrations for the same email address.
      // The database/application logic should allow exactly one to succeed.
      const results = await Promise.all([createUser(input), createUser(input)]);

      assert.equal(results.filter(Boolean).length, 1);

      const user = results.find(Boolean);

      // New users should receive the default role and normalized email.
      assert.equal(user.role, 'user');
      assert.equal(user.email, 'test@example.com');

      // Public user objects must never expose the stored password hash.
      assert.ok(!('password_hash' in user));

      // Email lookup should also be case-insensitive/normalized.
      const credentials = await findUserByEmail('TEST@example.com');

      // Verify both the successful and unsuccessful password paths.
      assert.equal(
        await verifyPassword('test-password', credentials.password_hash),
        true,
      );
      assert.equal(
        await verifyPassword('wrong-password', credentials.password_hash),
        false,
      );

      // Fetching the current user by ID should return the same public shape.
      assert.deepEqual(await findUserById(user.id), user);

      // Confirm that role changes in PostgreSQL are reflected by subsequent
      // user lookups rather than being cached or hard-coded.
      await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [
        user.id,
      ]);
      assert.equal((await findUserById(user.id)).role, 'admin');

      // Consume every permitted authentication attempt in the active window.
      for (let attempt = 0; attempt < 20; attempt++) {
        assert.equal(await allowAuthAttempt(user.email), true);
      }

      // The next attempt should be rejected by the rate limiter.
      assert.equal(await allowAuthAttempt(user.email), false);

      // Expire the rate-limit record manually to verify that attempts become
      // available again once the configured window has passed.
      await pool.query(
        "UPDATE auth_attempts SET expires_at = now() - interval '1 second'",
      );
      assert.equal(await allowAuthAttempt(user.email), true);

      // Verify deletion behavior for both ID and email lookups.
      await pool.query('DELETE FROM users WHERE id = $1', [user.id]);

      assert.equal(await findUserById(user.id), null);
      assert.equal(await findUserByEmail(user.email), null);
    } finally {
      // Always clean up connections, globals, and the temporary schema,
      // including when an assertion or database operation fails.
      await connections.end();
      delete globalThis.appDatabase;

      await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
      await admin.end();
    }
  },
);
