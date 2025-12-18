import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator'

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  username: string

  @IsString()
  @IsOptional()
  profileDescription: string
}
