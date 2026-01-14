import { DbModule } from './../db/db.module'
import { Module } from '@nestjs/common'
import { PostController } from './post.controller'
import { PostService } from './post.service'
import { CloudinaryModule } from '../cloudinary/cloudinary.module'

@Module({
  imports: [DbModule, CloudinaryModule],
  controllers: [PostController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}
