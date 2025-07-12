import {
  IsString,
  IsEmail,
  IsNotEmpty,
  Length,
  Matches,
  IsOptional,
  IsIn,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @Length(8, 12)
  @Matches(/^\d+$/, { message: 'DNI debe contener solo números' })
  dni: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 150)
  fullName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 50)
  password: string;

  @IsString()
  @IsIn(['visitante', 'afiliado'])
  role: 'visitante' | 'afiliado';

  // Campos específicos para afiliados
  @IsOptional()
  @IsString()
  @Length(9, 20)
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

  @IsOptional()
  sponsorId?: number; // ID del afiliado que lo refiere
}