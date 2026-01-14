import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { DbService } from '../db/db.service'
import * as s from '../db/schema'
import { CloudinaryService } from '../cloudinary/cloudinary.service'
import { desc, eq, and } from 'drizzle-orm'
import { NewPostDto } from './dto'
import { type ReqAuthType } from '../auth/types'

@Injectable()
export class PostService {
  constructor(
    private dbService: DbService,
    private cloudinaryService: CloudinaryService,
  ) {}

  public async getPostList(limit: number = 20, offset: number = 20) {
    const postList = await this.dbService.db.query.postTable.findMany({
      orderBy: desc(s.postTable.createdAt),
      limit: limit,
      offset: offset,
    })
    return postList
  }

  public async getUserPost(
    userId: number,
    limit: number = 20,
    offset: number = 20,
  ) {
    const [currentUserProfile] = await this.dbService.db
      .select()
      .from(s.profileTable)
      .where(eq(s.profileTable.userId, userId))
    if (!currentUserProfile)
      throw new NotFoundException('User profile not found')
    const posts = await this.dbService.db
      .select()
      .from(s.postTable)
      .where(eq(s.postTable.profileId, currentUserProfile.id))
      .orderBy(desc(s.postTable.createdAt))
      .limit(limit)
      .offset(offset)

    return posts
  }

  public async getPostDetail(id: number) {
    const currentPost = this.dbService.db.query.postTable.findFirst({
      where: eq(s.postTable.id, id),
      with: {
        comments: true,
        likedBy: true,
        userProfile: true,
      },
    })
    if (!currentPost) throw new NotFoundException('Post not found')
    return currentPost
  }

  public async createPost(
    userId: number,
    dto: NewPostDto,
    file: Express.Multer.File,
  ) {
    const currentUserProfile =
      await this.dbService.db.query.profileTable.findFirst({
        where: eq(s.profileTable.userId, userId),
      })
    if (!currentUserProfile)
      throw new NotFoundException('User profile not found.')

    const cloudinaryRes = await this.cloudinaryService.uploadPostImage(
      file,
      userId,
    )
    const [newPost] = await this.dbService.db
      .insert(s.postTable)
      .values({
        profileId: currentUserProfile.id,
        imageId: cloudinaryRes.publicId,
        text: dto.text,
      })
      .returning()
    return newPost
  }

  public async deletePost(user: ReqAuthType, postId: number) {
    const currentUserProfile =
      await this.dbService.db.query.profileTable.findFirst({
        where: eq(s.profileTable.id, user.userId),
      })
    if (!currentUserProfile)
      throw new NotFoundException('User profile not found.')
    const targetPost = await this.dbService.db.query.postTable.findFirst({
      where: eq(s.postTable.id, postId),
    })
    if (!targetPost)
      throw new HttpException('Post not found', HttpStatus.NOT_FOUND)
    if (
      targetPost.profileId !== currentUserProfile.id ||
      (user.role !== 'MANAGER' && user.role !== 'ADMIN')
    )
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)

    await this.dbService.db
      .delete(s.postTable)
      .where(eq(s.postTable.id, targetPost.id))
    await this.cloudinaryService.deleteImage(targetPost.imageId)
    return { message: 'Successfully deleted post.' }
  }

  public async likePost(postId: string, user: ReqAuthType) {
    const [currentUserProfile] = await this.dbService.db
      .select()
      .from(s.profileTable)
      .where(eq(s.profileTable.userId, user.userId))

    const [targetPost] = await this.dbService.db
      .select()
      .from(s.postTable)
      .where(eq(s.postTable.id, parseInt(postId)))
    if (!currentUserProfile)
      throw new NotFoundException('User profile not found.')
    if (!targetPost) throw new NotFoundException('Post not found.')
    if (targetPost.profileId !== currentUserProfile.id)
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)
    await this.dbService.db.insert(s.postLike).values({
      postId: targetPost.id,
      profileId: currentUserProfile.id,
    })
    return { message: 'Successfully liked the post' }
  }
  public async unlikePost(postId: string, user: ReqAuthType) {
    const [currentUserProfile] = await this.dbService.db
      .select()
      .from(s.profileTable)
      .where(eq(s.profileTable.userId, user.userId))

    const [targetPost] = await this.dbService.db
      .select()
      .from(s.postTable)
      .where(eq(s.postTable.id, parseInt(postId)))
    if (!currentUserProfile)
      throw new NotFoundException('User profile not found.')
    if (!targetPost) throw new NotFoundException('Post not found.')
    if (targetPost.profileId !== currentUserProfile.id)
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)

    await this.dbService.db
      .delete(s.postLike)
      .where(
        and(
          eq(s.postLike.postId, targetPost.id),
          eq(s.postLike.profileId, currentUserProfile.id),
        ),
      )
    return { message: 'Successfully unliked the post' }
  }
}
