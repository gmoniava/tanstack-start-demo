import { readdir, readFile } from 'node:fs/promises'
import pg from 'pg'

if (!process.env.DATABASE_URL)
  throw new Error('Set DATABASE_URL in .env before running migrations')
const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
try {
  await client.query('BEGIN')
  await client.query('SELECT pg_advisory_xact_lock(7140926)')
  await client.query(
    'CREATE TABLE IF NOT EXISTS app_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  )
  const directory = new URL('../db/migrations/', import.meta.url)
  const files = (await readdir(directory))
    .filter((file) => file.endsWith('.sql'))
    .sort()
  for (const file of files) {
    const existing = await client.query(
      'SELECT name FROM app_migrations WHERE name = $1',
      [file],
    )
    if (existing.rowCount) continue
    await client.query(await readFile(new URL(file, directory), 'utf8'))
    await client.query('INSERT INTO app_migrations (name) VALUES ($1)', [file])
    console.log(`Applied ${file}`)
  }
  await client.query('COMMIT')
  console.log('Database is up to date.')
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  await client.end()
}
