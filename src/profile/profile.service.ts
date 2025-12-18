import { Injectable, NotFoundException } from '@nestjs/common'
import { DbService } from '../db/db.service'
import * as s from '../db/schema'
import { eq } from 'drizzle-orm'
import { UpdateProfileDto } from './dto'

@Injectable()
export class ProfileService {
  constructor(private dbService: DbService) {}

  async getProfile(userId: number) {
    const [user] = await this.dbService.db
      .select({
        id: s.usersTable.id,
        email: s.usersTable.email,
        role: s.usersTable.role,
        createdAt: s.usersTable.createdAt,
        profile: {
          username: s.profileTable.username,
          imageId: s.profileTable.imageId,
          profileDescription: s.profileTable.profileDescription,
        },
      })
      .from(s.usersTable)
      .leftJoin(s.profileTable, eq(s.usersTable.id, s.profileTable.userId))
      .where(eq(s.usersTable.id, userId))

    if (!user) throw new NotFoundException('User not found')
    return user
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const [profile] = await this.dbService.db
      .update(s.profileTable)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(s.profileTable.userId, userId))
      .returning()

    if (!profile) throw new NotFoundException('Profile not found')
    return profile
  }
}
