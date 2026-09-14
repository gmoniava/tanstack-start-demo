import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import pg from 'pg'
import {
  createUser,
  findUserById,
  findUserByEmail,
  allowAuthAttempt,
} from '../src/utils/users.server.ts'
import { hashPassword, verifyPassword } from '../src/utils/password.server.ts'

test(
  'PostgreSQL registration, duplicate races, login, current user and rate limits',
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    // Isolate test tables in a unique schema; never alter existing application tables.
    const schema = `auth_test_${randomUUID().replaceAll('-', '')}`
    const admin = new pg.Client({
      connectionString: process.env.TEST_DATABASE_URL,
    })
    await admin.connect()
    const connections = new pg.Pool({
      connectionString: process.env.TEST_DATABASE_URL,
    })
    // Transaction-local settings work with hosted transaction poolers too.
    const pool = {
      async query(sql, values) {
        const client = await connections.connect()
        try {
          await client.query('BEGIN')
          await client.query(`SET LOCAL search_path TO "${schema}"`)
          const result = await client.query(sql, values)
          await client.query('COMMIT')
          return result
        } catch (error) {
          await client.query('ROLLBACK')
          throw error
        } finally {
          client.release()
        }
      },
    }
    globalThis.appDatabase = pool
    try {
      await admin.query(`CREATE SCHEMA "${schema}"`)
      await pool.query(
        await readFile(
          new URL('../db/migrations/001_users.sql', import.meta.url),
          'utf8',
        ),
      )
      const passwordHash = await hashPassword('test-password')
      const input = {
        name: 'Test User',
        email: ' Test@Example.com ',
        passwordHash,
      }
      const results = await Promise.all([createUser(input), createUser(input)])
      assert.equal(results.filter(Boolean).length, 1)
      const user = results.find(Boolean)
      assert.equal(user.role, 'user')
      assert.equal(user.email, 'test@example.com')
      assert.ok(!('password_hash' in user))
      const credentials = await findUserByEmail('TEST@example.com')
      assert.equal(
        await verifyPassword('test-password', credentials.password_hash),
        true,
      )
      assert.equal(
        await verifyPassword('wrong-password', credentials.password_hash),
        false,
      )
      assert.deepEqual(await findUserById(user.id), user)
      await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [
        user.id,
      ])
      assert.equal((await findUserById(user.id)).role, 'admin')
      for (let attempt = 0; attempt < 20; attempt++)
        assert.equal(await allowAuthAttempt(user.email), true)
      assert.equal(await allowAuthAttempt(user.email), false)
      await pool.query(
        "UPDATE auth_attempts SET expires_at = now() - interval '1 second'",
      )
      assert.equal(await allowAuthAttempt(user.email), true)
      await pool.query('DELETE FROM users WHERE id = $1', [user.id])
      assert.equal(await findUserById(user.id), null)
      assert.equal(await findUserByEmail(user.email), null)
    } finally {
      await connections.end()
      delete globalThis.appDatabase
      await admin.query(`DROP SCHEMA "${schema}" CASCADE`)
      await admin.end()
    }
  },
)
