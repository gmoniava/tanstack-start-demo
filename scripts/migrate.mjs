import { readdir, readFile } from 'node:fs/promises'
import pg from 'pg'

// Make sure we know which database to connect to.
if (!process.env.DATABASE_URL)
  throw new Error('Set DATABASE_URL in .env before running migrations')

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })

await client.connect()

try {
  // Run all migrations in one transaction.
  await client.query('BEGIN')

  // Prevent multiple migration processes from running at the same time.
  await client.query('SELECT pg_advisory_xact_lock(7140926)')

  // Keep track of migrations that have already been applied.
  await client.query(
    'CREATE TABLE IF NOT EXISTS app_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  )

  // Load migration files in a predictable order.
  const directory = new URL('../db/migrations/', import.meta.url)
  const files = (await readdir(directory))
    .filter((file) => file.endsWith('.sql'))
    .sort()

  for (const file of files) {
    // Skip migrations that were already applied.
    const existing = await client.query(
      'SELECT name FROM app_migrations WHERE name = $1',
      [file],
    )

    if (existing.rowCount) continue

    // Run the migration SQL.
    await client.query(await readFile(new URL(file, directory), 'utf8'))

    // Mark the migration as applied.
    await client.query('INSERT INTO app_migrations (name) VALUES ($1)', [file])

    console.log(`Applied ${file}`)
  }

  // Save all migration changes.
  await client.query('COMMIT')
  console.log('Database is up to date.')
} catch (error) {
  // Undo everything if any migration fails.
  await client.query('ROLLBACK')
  throw error
} finally {
  // Always close the database connection.
  await client.end()
}
