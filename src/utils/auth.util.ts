import * as bcrypt from 'bcryptjs';
import { User } from '@prisma/client';

export class AuthUtil {
  /**
   * Encripta una contraseña usando bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compara una contraseña con su hash
   */
  static async comparePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Genera payload para JWT basado en user de la DB
   */
  static createJwtPayload(user: User) {
    return {
      id: user.id,
      dni: user.dni,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };
  }
}
