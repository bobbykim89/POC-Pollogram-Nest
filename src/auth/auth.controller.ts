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
import { AuthService } from './auth.service'
import { SignUpDto, SignInDto } from './dto'
import { JwtRefreshGuard, JwtAuthGuard } from './guards'
import { JwtAccessStrategy, JwtRefreshStrategy } from './strategies'
import { type Request } from 'express'
import { GetUser } from './decorator'
import type { ReqAuthType } from './types'

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  async signUp(@Body() dto: SignUpDto, @Req() req: Request) {
    const metaData = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    }
    return await this.authService.signUp(dto, metaData)
  }

  @HttpCode(HttpStatus.OK)
  @Post('signin')
  async signIn(@Body() dto: SignInDto, @Req() req: Request) {
    const metadata = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    }
    return await this.authService.signIn(dto, metadata)
  }

  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Req() req: Request, @GetUser() user: ReqAuthType) {
    const { userId, refreshToken } = user
    const metadata = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    }
    return await this.authService.refreshTokens(userId, refreshToken, metadata)
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@GetUser() user: ReqAuthType) {
    return await this.authService.logout(user.userId)
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout-all')
  async logoutAll(@GetUser() user: ReqAuthType) {
    return await this.authService.logout(user.userId)
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async getSessions(@GetUser() user: ReqAuthType) {
    return await this.authService.getActiveSessions(user.userId)
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Delete('sessions/:sessionId')
  async revokeSession(
    @GetUser() user: ReqAuthType,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return await this.authService.revokeSession(user.userId, sessionId)
  }
}
