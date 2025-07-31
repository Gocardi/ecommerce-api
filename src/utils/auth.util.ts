import * as bcrypt from 'bcrypt';

export class AuthUtil {
  /**
   * Hash de password usando bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Comparar password con hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generar password temporal
   */
  static generateTempPassword(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Validar DNI peruano
   */
  static validateDNI(dni: string): boolean {
    return /^\d{8}$/.test(dni);
  }

  /**
   * Validar email
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}