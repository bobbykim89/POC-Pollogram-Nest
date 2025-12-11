import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

async function main() {
  const sql = neon(process.env.DATABASE_URL!)
  const db = drizzle(sql, { schema: schema })
  console.log('-- Initializing migration')
  await migrate(db, { migrationsFolder: 'src/migrations' })
  console.log('-- Migrations completed')
  process.exit(0)
}

main().catch((err) => {
  console.error('-- Migration failed')
  console.error(err)
  process.exit(1)
})
