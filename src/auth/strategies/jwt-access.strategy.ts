import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'

export type JwtPayload = {
  sub: number
  email: string
  role: string
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET')!,
    })
  }

  async validate(payload: JwtPayload) {
    if (!payload) throw new UnauthorizedException()
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    }
  }
}
