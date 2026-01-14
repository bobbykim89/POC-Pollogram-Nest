import { IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class NewPostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text: string
}
