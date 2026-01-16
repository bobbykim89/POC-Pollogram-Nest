import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ProfileService } from './profile.service'
import { UpdateProfileDto } from './dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { GetUser } from '../auth/decorator'
import type { ReqAuthType } from '../auth/types'

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getProfileList() {
    return await this.profileService.getProfileList()
  }

  @Get('current-user')
  @HttpCode(HttpStatus.OK)
  async getCurrentUserProfile(@GetUser() user: ReqAuthType) {
    return await this.profileService.getProfile(user.userId)
  }

  @Get('/:userId')
  @HttpCode(HttpStatus.OK)
  async getProfileById(@Param() userId: number) {
    return await this.profileService.getProfile(userId)
  }

  @Patch('edit')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @GetUser() user: ReqAuthType,
    @Body() dto: UpdateProfileDto,
  ) {
    return await this.profileService.updateProfile(user.userId, dto)
  }

  @Post('edit/image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image'))
  async uploadProfileImage(
    @GetUser() user: ReqAuthType,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /\/(jpg|jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return await this.profileService.uploadProfileImage(user.userId, file)
  }

  @Delete('edit/image')
  @HttpCode(HttpStatus.OK)
  async deleteProfileImage(@GetUser() user: ReqAuthType) {
    return await this.profileService.deleteProfileImage(user.userId)
  }

  @Post(':profileId/follow')
  @HttpCode(HttpStatus.OK)
  async followUser(
    @Param('profileId', ParseIntPipe) profileId: number,
    @GetUser() user: ReqAuthType,
  ) {
    return await this.profileService.followProfile(profileId, user)
  }

  @Delete(':profileId/follow')
  @HttpCode(HttpStatus.OK)
  async unfollowUser(
    @Param('profileId', ParseIntPipe) profileId: number,
    @GetUser() user: ReqAuthType,
  ) {
    return await this.profileService.unfollowProfile(profileId, user)
  }
}
