import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  DefaultValuePipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common'
import { PostService } from './post.service'
import { FileInterceptor } from '@nestjs/platform-express'
import { NewPostDto } from './dto'
import { JwtAuthGuard } from '../auth/guards'
import { GetUser } from '../auth/decorator'
import { type ReqAuthType } from '../auth/types'

@Controller('posts')
export class PostController {
  constructor(private postService: PostService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getPostList(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return await this.postService.getPostList(limit, offset)
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  async createPost(
    @GetUser() user: ReqAuthType,
    @Body() dto: NewPostDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /\/(jpg|jpeg|png|gif|webp)$/ }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.postService.createPost(user.userId, dto, file)
  }

  @Get('user/:userId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async findUserPost(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return await this.postService.getUserPost(userId, limit, offset)
  }

  @Get('current-user')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async findCurrentUserPost(
    @GetUser() user: ReqAuthType,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return await this.postService.getUserPost(user.userId, limit, offset)
  }

  @Get('pollito')
  @HttpCode(HttpStatus.OK)
  async getPollito() {
    return { message: 'pio pio' }
  }

  @Get(':postId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async getPostDetail(@Param('postId', ParseIntPipe) postId: number) {
    return await this.postService.getPostDetail(postId)
  }

  @Delete(':postId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async deletePost(
    @Param('postId', ParseIntPipe) postId: number,
    @GetUser() user: ReqAuthType,
  ) {
    return await this.postService.deletePost(user, postId)
  }

  @Post(':postId/like')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async likePost(
    @Param('postId', ParseIntPipe) postId: number,
    @GetUser() user: ReqAuthType,
  ) {
    return await this.postService.likePost(postId, user)
  }

  @Delete(':postId/like')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async unlikePost(
    @Param('postId', ParseIntPipe) postId: number,
    @GetUser() user: ReqAuthType,
  ) {
    return this.postService.unlikePost(postId, user)
  }
}
