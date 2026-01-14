import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
} from '@nestjs/common'
import { PostService } from './post.service'

@Controller('post')
export class PostController {
  constructor(private postService: PostService) {}

  @Get()
  async getPostList() {
    return await this.postService.getPostList()
  }

  @Get('pollito')
  async getPollito() {
    return { message: 'pio pio' }
  }
}
