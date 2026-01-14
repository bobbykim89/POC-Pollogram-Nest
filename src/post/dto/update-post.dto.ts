import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
} from 'class-validator'

export class UpdatePostDto {
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  text: string
}
