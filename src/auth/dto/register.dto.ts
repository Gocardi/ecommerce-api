import { IsString, IsNotEmpty, IsEmail, Length, Matches, IsOptional, IsInt, Min } from 'class-validator';

export class RegisterUserDto {
  @IsString()
  @IsNotEmpty({ message: 'El DNI es requerido' })
  @Length(8, 8, { message: 'El DNI debe tener 8 dígitos' })
  @Matches(/^\d+$/, { message: 'El DNI debe contener solo números' })
  dni: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre completo es requerido' })
  @Length(2, 150, { message: 'El nombre debe tener entre 2 y 150 caracteres' })
  fullName: string;

  @IsEmail({}, { message: 'El email no es válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @Length(6, 50, { message: 'La contraseña debe tener entre 6 y 50 caracteres' })
  password: string;

  // Campos opcionales para usuarios normales
  @IsOptional()
  @IsString()
  @Length(9, 20, { message: 'El teléfono debe tener entre 9 y 20 caracteres' })
  phone?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class RegisterAffiliateDto {
  @IsString()
  @IsNotEmpty({ message: 'El DNI es requerido' })
  @Length(8, 8, { message: 'El DNI debe tener 8 dígitos' })
  @Matches(/^\d+$/, { message: 'El DNI debe contener solo números' })
  dni: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre completo es requerido' })
  @Length(2, 150, { message: 'El nombre debe tener entre 2 y 150 caracteres' })
  fullName: string;

  @IsEmail({}, { message: 'El email no es válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @Length(6, 50, { message: 'La contraseña debe tener entre 6 y 50 caracteres' })
  password: string;

  // Campos obligatorios para afiliados
  @IsString()
  @IsNotEmpty({ message: 'El teléfono es requerido' })
  @Length(9, 20, { message: 'El teléfono debe tener entre 9 y 20 caracteres' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: 'La región es requerida' })
  region: string;

  @IsString()
  @IsNotEmpty({ message: 'La ciudad es requerida' })
  city: string;

  @IsString()
  @IsNotEmpty({ message: 'La dirección es requerida' })
  address: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsInt({ message: 'El máximo de referidos debe ser un número entero' })
  @Min(1, { message: 'El máximo de referidos debe ser al menos 1' })
  maxReferrals?: number;
}

export class RegisterAdminDto {
  @IsString()
  @IsNotEmpty({ message: 'El DNI es requerido' })
  @Length(8, 8, { message: 'El DNI debe tener 8 dígitos' })
  @Matches(/^\d+$/, { message: 'El DNI debe contener solo números' })
  dni: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre completo es requerido' })
  @Length(2, 150, { message: 'El nombre debe tener entre 2 y 150 caracteres' })
  fullName: string;

  @IsEmail({}, { message: 'El email no es válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @Length(6, 50, { message: 'La contraseña debe tener entre 6 y 50 caracteres' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'El teléfono es requerido' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: 'La región es requerida' })
  region: string;

  @IsString()
  @IsNotEmpty({ message: 'La ciudad es requerida' })
  city: string;
}