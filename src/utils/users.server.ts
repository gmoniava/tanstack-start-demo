import { randomUUID } from 'node:crypto';
import { getDatabase } from './db.server.ts';

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
};

export async function findUserById(id: string) {
  const result = await getDatabase().query<User>(
    'SELECT id, name, email, role FROM users WHERE id = $1',
    [id],
  );
  return result.rows.at(0) ?? null;
}

export async function findUserByEmail(email: string) {
  const result = await getDatabase().query<User & { password_hash: string }>(
    'SELECT id, name, email, role, password_hash FROM users WHERE email = $1',
    [email.trim().toLowerCase()],
  );
  return result.rows.at(0) ?? null;
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}) {
  const result = await getDatabase().query<User>(
    `INSERT INTO users (id, name, email, password_hash)
     VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING
     RETURNING id, name, email, role`,
    [
      randomUUID(),
      input.name.trim(),
      input.email.trim().toLowerCase(),
      input.passwordHash,
    ],
  );
  return result.rows.at(0) ?? null;
}

// A shared per-account limit across server instances, with expiring buckets.
export async function allowAuthAttempt(email: string) {
  const db = getDatabase();
  await db.query('DELETE FROM auth_attempts WHERE expires_at <= now()');

  // Track authentication attempts per email in a fixed 15-minute
  // window. If this email has no active record, start at
  // attempt #1. If the existing window has expired, reset the
  // counter to 1 and start a new 15-minute window.
  // Otherwise, increment the existing counter without extending
  // its expiry.
  const result = await db.query<{ attempts: number }>(
    `INSERT INTO auth_attempts (email, attempts, expires_at)
     VALUES ($1, 1, now() + interval '15 minutes')
     ON CONFLICT (email) DO UPDATE SET
       attempts = CASE WHEN auth_attempts.expires_at <= now() THEN 1 ELSE auth_attempts.attempts + 1 END,
       expires_at = CASE WHEN auth_attempts.expires_at <= now() THEN now() + interval '15 minutes' ELSE auth_attempts.expires_at END
     RETURNING attempts`,
    [email],
  );
  return result.rows[0].attempts <= 20;
}
