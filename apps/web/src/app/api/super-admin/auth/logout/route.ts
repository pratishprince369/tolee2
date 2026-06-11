import { NextResponse } from 'next/server';
import { SUPER_ADMIN_COOKIE } from '@/lib/superAdminAuth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SUPER_ADMIN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  return response;
}
