import pg from 'pg'

// Store the PostgreSQL pool on globalThis so the app can reuse the same pool
// across repeated module reloads, especially during development/HMR.
//
// Without this, re-evaluating this module could create additional connection
// pools and eventually exhaust the database's available connections.
const databaseGlobal = globalThis as typeof globalThis & {
  appDatabase?: pg.Pool
}

export function getDatabase() {
  // Lazily create the pool the first time the database is requested.
  if (!databaseGlobal.appDatabase) {
    const connectionString = process.env.DATABASE_URL

    // Fail immediately if the application has no database configuration.
    if (!connectionString) {
      throw new Error('DATABASE_URL is required')
    }

    const pool = new pg.Pool({
      connectionString,

      // Allow this application instance to keep up to 10 PostgreSQL
      // connections open in the pool at once.
      max: 10,

      // Give up if a connection cannot be established within 5 seconds.
      connectionTimeoutMillis: 5000,

      // Close pooled connections that have been unused for 30 seconds.
      idleTimeoutMillis: 30000,
    })

    // A pooled connection can fail while sitting idle, for example if the
    // database restarts or the network connection is interrupted.
    pool.on('error', (error) => {
      console.error('Unexpected PostgreSQL pool error', error)
    })

    // Cache the pool so every later call reuses the same instance.
    databaseGlobal.appDatabase = pool
  }

  return databaseGlobal.appDatabase
}
