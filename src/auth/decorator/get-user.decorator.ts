import { createParamDecorator, ExecutionContext } from '@nestjs/common'

interface ReqAuthType {
  userId: string
  email: string
  role: string
  refreshToken: string
}

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest()
    const user = req.user
    return data ? user[data] : user
  },
)
