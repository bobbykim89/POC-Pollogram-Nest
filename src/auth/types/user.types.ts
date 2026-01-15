export interface ReqAuthType {
  userId: number
  email: string
  role: 'USER' | 'MANAGER' | 'ADMIN'
  refreshToken: string
}
