import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'El DNI es requerido' })
  @Length(8, 8, { message: 'El DNI debe tener 8 dígitos' })
  @Matches(/^\d+$/, { message: 'El DNI debe contener solo números' })
  dni: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @Length(6, 50, { message: 'La contraseña debe tener entre 6 y 50 caracteres' })
  password: string;
}
