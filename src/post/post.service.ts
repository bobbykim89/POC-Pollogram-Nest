import { Injectable } from '@nestjs/common'
import { DbService } from '../db/db.service'
import * as s from '../db/schema'
import { CloudinaryService } from '../cloudinary/cloudinary.service'
import { desc } from 'drizzle-orm'

@Injectable()
export class PostService {
  constructor(
    private dbService: DbService,
    private cloudinaryService: CloudinaryService,
  ) {}

  public async getPostList() {
    const postList = await this.dbService.db.query.postTable.findMany({
      orderBy: desc(s.postTable.createdAt),
    })
    return postList
  }
}
