import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { DbService } from '../db/db.service'
import { usersTable, profileTable, refreshTokensTable } from '../db/schema'
import { eq, and, gt, isNull, lt } from 'drizzle-orm'
import { SignUpDto, SignInDto } from './dto'

interface TokenMetadata {
  userAgent?: string
  ipAddress?: string
  deviceId?: string
}

@Injectable()
export class AuthService {
  constructor(
    private dbService: DbService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}
  async signUp(dto: SignUpDto, metadata?: TokenMetadata) {
    const { email, password, username } = dto
    // check if user exists
    const existingUser = await this.dbService.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))

    if (existingUser.length > 0) {
      throw new ConflictException('Email already exists')
    }
    // check if username exists
    const existingProfile = await this.dbService.db
      .select()
      .from(profileTable)
      .where(eq(profileTable.username, username))
    if (existingProfile.length > 0) {
      throw new ConflictException('Username already exists')
    }
    // hash password
    const hashedPassword = await bcrypt.hash(password, 10)
    // create user
    const [user] = await this.dbService.db
      .insert(usersTable)
      .values({ email, password: hashedPassword })
      .returning()
    // create profile
    const [profile] = await this.dbService.db
      .insert(profileTable)
      .values({ username, userId: user.id })
      .returning()
    // generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role)
    // store refresh token
    await this.storeRefreshToken(user.id, tokens.refreshToken, metadata)

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: {
          username: profile.username,
        },
      },
      ...tokens,
    }
  }
  async signIn(dto: SignInDto, metadata?: TokenMetadata) {
    const { email, password } = dto

    // find user
    const [user] = await this.dbService.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
    if (!user) throw new UnauthorizedException('Invalid credentials')
    // verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials')
    // get profile
    const [profile] = await this.dbService.db
      .select()
      .from(profileTable)
      .where(eq(profileTable.userId, user.id))

    // generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role)

    // store refresh token
    await this.storeRefreshToken(user.id, tokens.refreshToken, metadata)

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: profile ? { username: profile.username } : null,
      },
      ...tokens,
    }
  }
  async refreshTokens(
    userId: number,
    refreshToken: string,
    metadata?: TokenMetadata,
  ) {
    // hash the incoming token to compare with stored hash
    const hashedToken = await bcrypt.hash(refreshToken, 10)
    // find the refresh token
    const [storedToken] = await this.dbService.db
      .select()
      .from(refreshTokensTable)
      .where(
        and(
          eq(refreshTokensTable.userId, userId),
          gt(refreshTokensTable.expiresAt, new Date()), // not expired
          isNull(refreshTokensTable.isRevoked), // not revoked
        ),
      )
    if (!storedToken) throw new UnauthorizedException('Invalid refresh token')
    // verify the token matches
    const isTokenValid = await bcrypt.compare(refreshToken, storedToken.token)
    // potential token reuse attack - revoke all tokens for this user
    if (!isTokenValid) {
      await this.revokeAllTokens(userId)
      throw new UnauthorizedException(
        'Token reuse detected. All sessions revoked',
      )
    }
    // get user info
    const [user] = await this.dbService.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
    if (!user) throw new UnauthorizedException('User not found')
    // revoke old token
    await this.dbService.db
      .update(refreshTokensTable)
      .set({ isRevoked: new Date() })
      .where(eq(refreshTokensTable.id, storedToken.id))
    // generate new tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role)
    // store new refresh token
    await this.storeRefreshToken(user.id, tokens.refreshToken, metadata)
    return tokens
  }
  async logout(userId: number, refreshToken?: string) {
    if (!refreshToken) {
      // Logout from all devices
      await this.revokeAllTokens(userId)
      return { message: 'Logged out successfully' }
    }
    // Logout from specific device
    const [storedToken] = await this.dbService.db
      .select()
      .from(refreshTokensTable)
      .where(eq(refreshTokensTable.userId, userId))
    if (!storedToken) return { message: 'Logged out successfully' }

    const isTokenValid = await bcrypt.compare(refreshToken, storedToken.token)
    if (!isTokenValid) return { message: 'Logged out successfully' }

    await this.dbService.db
      .update(refreshTokensTable)
      .set({ isRevoked: new Date() })
      .where(eq(refreshTokensTable.id, storedToken.id))

    return { message: 'Logged out successfully' }
  }
  async getActiveSessions(userId: number) {
    const sessions = await this.dbService.db
      .select({
        id: refreshTokensTable.id,
        createdAt: refreshTokensTable.createdAt,
        lastUsedAt: refreshTokensTable.lastUsedAt,
        expiresAt: refreshTokensTable.expiresAt,
        userAgent: refreshTokensTable.userAgent,
        ipAddress: refreshTokensTable.ipAddress,
        deviceId: refreshTokensTable.deviceId,
      })
      .from(refreshTokensTable)
      .where(
        and(
          eq(refreshTokensTable.userId, userId),
          gt(refreshTokensTable.expiresAt, new Date()),
          isNull(refreshTokensTable.isRevoked),
        ),
      )
    return sessions
  }
  async revokeSession(userId: number, sessionId: number) {
    await this.dbService.db
      .update(refreshTokensTable)
      .set({ isRevoked: new Date() })
      .where(
        and(
          eq(refreshTokensTable.id, sessionId),
          eq(refreshTokensTable.userId, userId),
        ),
      )
    return { message: 'Session revoked successfully' }
  }
  //   clean up expired tokens (run this periodically)
  async cleanupExpiredTokens() {
    const deleted = await this.dbService.db
      .delete(refreshTokensTable)
      .where(lt(refreshTokensTable.expiresAt, new Date()))
      .returning()

    return { deleted: deleted.length }
  }
  private async generateTokens(userId: number, email: string, role: string) {
    const payload = { sub: userId, email, role }
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRATION'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRATION'),
      }),
    ])
    return { accessToken, refreshToken }
  }
  private async storeRefreshToken(
    userId: number,
    refreshToken: string,
    metaData?: TokenMetadata,
  ) {
    const hashedToken = await bcrypt.hash(refreshToken, 10)
    const expiresIn = this.config.get('JWT_REFRESH_EXPIRATION')
    // parse expiration (e.g. "7d" -> 7 days)
    const expirationMs = this.parseExpiration(expiresIn)
    const expiresAt = new Date(Date.now() + expirationMs)

    await this.dbService.db.insert(refreshTokensTable).values({
      token: hashedToken,
      userId,
      expiresAt,
      userAgent: metaData?.userAgent,
      ipAddress: metaData?.ipAddress,
      deviceId: metaData?.deviceId,
    })
  }
  private async revokeAllTokens(userId: number) {
    await this.dbService.db
      .update(refreshTokensTable)
      .set({ isRevoked: new Date() })
      .where(
        and(
          eq(refreshTokensTable.userId, userId),
          isNull(refreshTokensTable.isRevoked),
        ),
      )
  }
  private parseExpiration(expiration: string): number {
    const units: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    }
    const match = expiration.match(/^(\d+)([smhd])$/)
    if (!match) return 7 * 24 * 60 * 60 * 1000 // default 7 days
    const [, val, unit] = match
    return parseInt(val) * units[unit]
  }
}
