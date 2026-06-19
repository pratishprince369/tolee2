import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SUPER_ADMIN_JWT_SECRET as string;
if (!JWT_SECRET) {
  throw new Error('SUPER_ADMIN_JWT_SECRET environment variable is not set. Server cannot start securely.');
}
export const SUPER_ADMIN_COOKIE = 'sa_token';

export function signSuperAdminToken(email: string): string {
  return jwt.sign(
    { role: 'super_admin', email, iss: 'tolee' },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

export function verifySuperAdminToken(token: string): any {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded?.role === 'super_admin') {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
}
