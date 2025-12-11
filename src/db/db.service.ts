import { Injectable, OnModuleInit } from '@nestjs/common'
import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

@Injectable()
export class DbService implements OnModuleInit {
  private _db: NeonHttpDatabase<typeof schema>

  async onModuleInit() {
    const sql = neon(process.env.DATABASE_URL!)
    this._db = drizzle(sql, { schema })
  }
  get db() {
    return this._db
  }
}
