import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @Length(8, 12)
  @Matches(/^\d+$/, { message: 'DNI debe contener solo números' })
  dni: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 50)
  password: string;
}
