import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { DbService } from '../db/db.service'
import * as s from '../db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { UpdateProfileDto } from './dto'
import { CloudinaryService } from '../cloudinary/cloudinary.service'
import { ReqAuthType } from '../auth/types'

@Injectable()
export class ProfileService {
  constructor(
    private dbService: DbService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async getProfileList() {
    const profileList = await this.dbService.db
      .select()
      .from(s.profileTable)
      .orderBy(desc(s.postTable.createdAt))

    return profileList
  }

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
    if (user.profile?.imageId) {
      return {
        ...user,
        profile: {
          ...user.profile,
          imageUrl: this.cloudinaryService.getOptimizedUrl(
            user.profile.imageId,
          ),
        },
      }
    }

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

  async uploadProfileImage(userId: number, file: Express.Multer.File) {
    const [existingProfile] = await this.dbService.db
      .select()
      .from(s.profileTable)
      .where(eq(s.profileTable.userId, userId))

    if (!existingProfile) throw new NotFoundException('Profile not found')

    // delete old image if exists
    if (existingProfile.imageId) {
      try {
        await this.cloudinaryService.deleteImage(existingProfile.imageId)
      } catch (error) {
        // log error but continue with upload
        console.error('Failed to delete old image', error)
      }
    }
    // upload new image
    const uploadRes = await this.cloudinaryService.uploadProfileImage(
      file,
      userId,
    )

    // update profile with new imageId
    const [updatedProfile] = await this.dbService.db
      .update(s.profileTable)
      .set({
        imageId: uploadRes.publicId,
        updatedAt: new Date(),
      })
      .where(eq(s.profileTable.userId, userId))
      .returning()

    return {
      profile: updatedProfile,
      image: {
        url: uploadRes.secureUrl,
        publicId: uploadRes.publicId,
      },
    }
  }

  async deleteProfileImage(userId: number) {
    const [profile] = await this.dbService.db
      .select()
      .from(s.profileTable)
      .where(eq(s.profileTable.userId, userId))

    if (!profile) throw new NotFoundException('Profile not found')
    if (!profile.imageId)
      throw new BadRequestException('No profile image to delete')

    // delete from claudinary
    await this.cloudinaryService.deleteImage(profile.imageId)

    // update db
    await this.dbService.db
      .update(s.profileTable)
      .set({
        imageId: null,
        updatedAt: new Date(),
      })
      .where(eq(s.profileTable.userId, userId))

    return { message: 'Profile image deleted successfully' }
  }

  async followProfile(profileId: number, user: ReqAuthType) {
    const [currentUserProfile] = await this.dbService.db
      .select()
      .from(s.profileTable)
      .where(eq(s.profileTable.id, user.userId))
    const [targetUserProfile] = await this.dbService.db
      .select()
      .from(s.profileTable)
      .where(eq(s.profileTable.id, profileId))
    if (!currentUserProfile || !targetUserProfile)
      throw new HttpException('User profile not found', HttpStatus.NOT_FOUND)
    await this.dbService.db.insert(s.follow).values({
      followedById: currentUserProfile.id,
      followingId: targetUserProfile.id,
    })
    return { message: 'Successfully followed user' }
  }

  async unfollowProfile(profileId: number, user: ReqAuthType) {
    const [currentUserProfile] = await this.dbService.db
      .select()
      .from(s.profileTable)
      .where(eq(s.profileTable.id, user.userId))
    const [targetUserProfile] = await this.dbService.db
      .select()
      .from(s.profileTable)
      .where(eq(s.profileTable.id, profileId))
    if (!currentUserProfile || !targetUserProfile)
      throw new HttpException('User profile not found', HttpStatus.NOT_FOUND)
    const [checkFollow] = await this.dbService.db
      .select()
      .from(s.follow)
      .where(
        and(
          eq(s.follow.followedById, currentUserProfile.id),
          eq(s.follow.followingId, targetUserProfile.id),
        ),
      )
    if (!checkFollow)
      throw new HttpException('Not found.', HttpStatus.NOT_FOUND)
    await this.dbService.db
      .delete(s.follow)
      .where(
        and(
          eq(s.follow.followedById, currentUserProfile.id),
          eq(s.follow.followingId, targetUserProfile.id),
        ),
      )
    return { message: 'Successfully unfollowed user.' }
  }
}
