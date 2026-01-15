import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { DbService } from '../db/db.service'
import { CommentInputDto } from './dto'
import * as s from '../db/schema'
import { and, desc, eq } from 'drizzle-orm'
import type { ReqAuthType } from '../auth/types'

@Injectable()
export class CommentService {
  constructor(private dbService: DbService) {}

  public async listComments(
    postId: number,
    limit: number = 20,
    offset: number = 20,
  ) {
    const commentList = await this.dbService.db.query.commentTable.findMany({
      where: eq(s.commentTable.postId, postId),
      orderBy: desc(s.commentTable.createdAt),
      with: {
        userProfile: true,
        likedBy: true,
      },
      limit: limit,
      offset: offset,
    })

    return commentList
  }

  public async createNewComment(
    postId: number,
    user: ReqAuthType,
    dto: CommentInputDto,
  ) {
    const [currentUserProfile] = await this.dbService.db
      .select()
      .from(s.profileTable)
      .where(eq(s.profileTable.userId, user.userId))
    if (!currentUserProfile)
      throw new HttpException('User profile not found', HttpStatus.NOT_FOUND)
    const [newComment] = await this.dbService.db
      .insert(s.commentTable)
      .values({
        postId: postId,
        profileId: currentUserProfile.id,
        text: dto.text,
      })
      .returning()

    return newComment
  }

  public async deleteComment(commentId: number, user: ReqAuthType) {
    const [currentUserProfile] = await this.dbService.db
      .select()
      .from(s.profileTable)
      .where(eq(s.profileTable.userId, user.userId))
    if (!currentUserProfile)
      throw new HttpException('User profile not found', HttpStatus.NOT_FOUND)
    const [targetComment] = await this.dbService.db
      .select()
      .from(s.commentTable)
      .where(eq(s.commentTable.id, commentId))
    if (!targetComment)
      throw new HttpException('Comment not found.', HttpStatus.NOT_FOUND)
    if (
      targetComment.profileId !== currentUserProfile.id &&
      user.role === 'USER'
    )
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)
    await this.dbService.db
      .delete(s.commentTable)
      .where(eq(s.commentTable.id, commentId))
    return { message: 'Successfully deleted comment.' }
  }

  public async likeComment(commentId: number, user: ReqAuthType) {
    const [currentUserProfile] = await this.dbService.db
      .select()
      .from(s.profileTable)
      .where(eq(s.profileTable.userId, user.userId))
    const [targetComment] = await this.dbService.db
      .select()
      .from(s.commentTable)
      .where(eq(s.commentTable.id, commentId))
    if (!currentUserProfile)
      throw new HttpException('User profile not found', HttpStatus.NOT_FOUND)
    if (!targetComment)
      throw new HttpException('Comment not found.', HttpStatus.NOT_FOUND)
    await this.dbService.db.insert(s.commentLike).values({
      commentId: commentId,
      profileId: currentUserProfile.id,
    })
    return { message: 'Successfully liked comment.' }
  }
  public async unlikeComment(commentId: number, user: ReqAuthType) {
    const [currentUserProfile] = await this.dbService.db
      .select()
      .from(s.profileTable)
      .where(eq(s.profileTable.userId, user.userId))
    const [targetComment] = await this.dbService.db
      .select()
      .from(s.commentTable)
      .where(eq(s.commentTable.id, commentId))
    if (!currentUserProfile)
      throw new HttpException('User profile not found', HttpStatus.NOT_FOUND)
    if (!targetComment)
      throw new HttpException('Comment not found.', HttpStatus.NOT_FOUND)
    const [checkLike] = await this.dbService.db
      .select()
      .from(s.commentLike)
      .where(
        and(
          eq(s.commentLike.commentId, commentId),
          eq(s.commentLike.profileId, currentUserProfile.id),
        ),
      )
    // throw error if like doesn't exist
    if (!checkLike) throw new HttpException('Not found', HttpStatus.NOT_FOUND)
    await this.dbService.db
      .delete(s.commentLike)
      .where(
        and(
          eq(s.commentLike.commentId, commentId),
          eq(s.commentLike.profileId, currentUserProfile.id),
        ),
      )
    return { message: 'Successfully unliked comment' }
  }
}
