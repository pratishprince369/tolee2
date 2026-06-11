import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const fileUrl = new URL('/tolee.apk', req.url);
  return NextResponse.redirect(fileUrl);
}
