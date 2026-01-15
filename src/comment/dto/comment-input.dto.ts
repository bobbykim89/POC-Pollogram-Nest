import { IsString, MaxLength, IsNotEmpty } from 'class-validator'

export class CommentInputDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text: string
}
