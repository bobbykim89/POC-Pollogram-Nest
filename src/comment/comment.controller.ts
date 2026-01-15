import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards'
import { GetUser } from '../auth/decorator'
import { type ReqAuthType } from '../auth/types'
import { CommentService } from './comment.service'
import { CommentInputDto } from './dto'

@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentController {
  constructor(private commentService: CommentService) {}

  @Get(':postId')
  async getCommentsList(
    @Param('postId', ParseIntPipe) postId: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return await this.commentService.listComments(postId, limit, offset)
  }

  @Post(':postId')
  async createNewComment(
    @Param('postId', ParseIntPipe) postId: number,
    @GetUser() user: ReqAuthType,
    @Body() dto: CommentInputDto,
  ) {
    return await this.commentService.createNewComment(postId, user, dto)
  }

  @Delete(':commentId')
  async deleteComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @GetUser() user: ReqAuthType,
  ) {
    return await this.commentService.deleteComment(commentId, user)
  }

  @Post(':commentId/like')
  async likeComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @GetUser() user: ReqAuthType,
  ) {
    return await this.commentService.likeComment(commentId, user)
  }

  @Delete(':commentId/like')
  async unlikeComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @GetUser() user: ReqAuthType,
  ) {
    return await this.commentService.unlikeComment(commentId, user)
  }
}
