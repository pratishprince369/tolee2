'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { verifySuperAdminToken } from '@/lib/superAdminAuth';
import { cookies, headers } from 'next/headers';

// =========================================================================
// 1. DYNAMIC DATE RANGE CALCULATOR HELPER
// =========================================================================
function getDateRange(rangeType: string, customStart?: string, customEnd?: string) {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  // Set time of "end" to end of today
  end.setHours(23, 59, 59, 999);

  switch (rangeType) {
    case 'Today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'Yesterday':
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'Last 7 Days':
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case 'Last 30 Days':
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      break;
    case 'This Month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'Last Month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    case 'custom':
      if (customStart) {
        start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
      } else {
        start.setDate(now.getDate() - 29);
        start.setHours(0, 0, 0, 0);
      }
      if (customEnd) {
        end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
      }
      break;
    default: // Default 30 days
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

// =========================================================================
// 2. PARSE USER AGENT UTILITY
// =========================================================================
function parseUserAgent(ua: string) {
  let device = "Desktop";
  let os = "Windows";
  let browser = "Chrome";

  const uaLower = (ua || '').toLowerCase();

  // Device detection
  if (uaLower.includes("mobi") || uaLower.includes("phone")) {
    device = "Mobile";
  } else if (uaLower.includes("tablet") || uaLower.includes("ipad") || (uaLower.includes("android") && !uaLower.includes("mobi"))) {
    device = "Tablet";
  }

  // OS detection
  if (uaLower.includes("windows")) os = "Windows";
  else if (uaLower.includes("iphone") || uaLower.includes("ipad")) os = "iOS";
  else if (uaLower.includes("android")) os = "Android";
  else if (uaLower.includes("macintosh") || uaLower.includes("mac os")) os = "macOS";
  else if (uaLower.includes("linux")) os = "Linux";

  // Browser detection
  if (uaLower.includes("edg/")) browser = "Edge";
  else if (uaLower.includes("chrome") && !uaLower.includes("chromium")) browser = "Chrome";
  else if (uaLower.includes("safari") && !uaLower.includes("chrome")) browser = "Safari";
  else if (uaLower.includes("firefox")) browser = "Firefox";

  return { device, os, browser };
}

// =========================================================================
// 3. SECURE AUTHORIZATION CHECK
// =========================================================================
async function checkSuperAdminAuthorized(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (session?.user && (session.user as any).isSuperAdmin) {
    return true;
  }
  const cookieStore = cookies();
  const adminCookie = cookieStore.get('sa_token')?.value;
  if (adminCookie) {
    const decoded = verifySuperAdminToken(adminCookie);
    if (decoded) return true;
  }
  return false;
}

// =========================================================================
// 4. SUBMIT/TRACK VISITOR SESSION AND EVENT
// =========================================================================
export async function trackVisitorEvent(data: {
  sessionId: string;
  path: string;
  referrer: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  eventType?: string;
  details?: string;
}) {
  try {
    if (!data.sessionId) return { success: false, error: 'Session ID required' };

    const headersList = headers();
    const userAgent = headersList.get('user-agent') || '';
    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || '127.0.0.1';

    // Parse User Agent
    const { device, os, browser } = parseUserAgent(userAgent);

    // Resolve geographic location from headers (accurate & fast on Cloud)
    // Dynamic fallback for offline/development environment
    const country = headersList.get('x-vercel-ip-country') || 'India';
    const state = headersList.get('x-vercel-ip-country-region') || 'Maharashtra';
    const city = headersList.get('x-vercel-ip-city') || 'Mumbai';

    // Referrer normalization
    let finalReferrer = data.referrer ? data.referrer.trim() : 'Direct Visit';
    if (finalReferrer.includes('google.')) finalReferrer = 'Google Search';
    else if (finalReferrer.includes('facebook.com')) finalReferrer = 'Facebook';
    else if (finalReferrer.includes('instagram.com') || finalReferrer.includes('ig.me')) finalReferrer = 'Instagram';
    else if (finalReferrer.includes('whatsapp.com') || finalReferrer.includes('wa.me')) finalReferrer = 'WhatsApp';
    else if (finalReferrer.includes('t.me') || finalReferrer.includes('telegram.org')) finalReferrer = 'Telegram';
    else if (finalReferrer.includes('youtube.com') || finalReferrer.includes('youtu.be')) finalReferrer = 'YouTube';

    // Check if user is logged in
    const session = await getServerSession(authOptions);
    const userId = session?.user ? (session.user as any).id : null;

    // Create or update Visitor Session
    const visitor = await prisma.visitorSession.upsert({
      where: { sessionId: data.sessionId },
      update: {
        userId: userId || undefined, // Set user ID if logged in
        updatedAt: new Date(),
      },
      create: {
        sessionId: data.sessionId,
        userId,
        ipAddress,
        userAgent,
        device,
        os,
        browser,
        country,
        state,
        city,
        referrer: finalReferrer,
        utmSource: data.utmSource || null,
        utmMedium: data.utmMedium || null,
        utmCampaign: data.utmCampaign || null,
      },
    });

    // Create Analytics Event
    const event = await prisma.analyticsEvent.create({
      data: {
        sessionId: data.sessionId,
        eventType: data.eventType || 'page_view',
        path: data.path || '/',
        details: data.details || '{}',
      },
    });

    return { 
      success: true, 
      visitorId: visitor.id, 
      eventId: event.id,
      location: `${visitor.city}, ${visitor.state}, ${visitor.country}`
    };
  } catch (error) {
    console.error('Error tracking visitor event:', error);
    return { success: false, error: 'Internal tracking error' };
  }
}

// =========================================================================
// 5. SUPER ADMIN ANALYTICS SUMMARY
// =========================================================================
export async function getAnalyticsSummary(rangeType: string, customStart?: string, customEnd?: string) {
  try {
    if (!(await checkSuperAdminAuthorized())) {
      return { success: false, error: 'Unauthorized' };
    }

    const { start, end } = getDateRange(rangeType, customStart, customEnd);

    // Queries
    const [
      totalSessions,
      uniqueUsers,
      totalSignups,
      totalLogins,
      returningSessionsCount,
      deviceCounts,
      locationCounts,
    ] = await Promise.all([
      // Total Visitor Sessions in date range
      prisma.visitorSession.count({
        where: { createdAt: { gte: start, lte: end } }
      }),
      // Logged in users count
      prisma.visitorSession.count({
        where: {
          createdAt: { gte: start, lte: end },
          userId: { not: null }
        }
      }),
      // Total Signups in date range
      prisma.analyticsEvent.count({
        where: {
          createdAt: { gte: start, lte: end },
          eventType: 'signup'
        }
      }),
      // Total Logins in date range
      prisma.analyticsEvent.count({
        where: {
          createdAt: { gte: start, lte: end },
          eventType: 'login'
        }
      }),
      // Sessions that are returning users
      prisma.visitorSession.count({
        where: {
          createdAt: { gte: start, lte: end },
          updatedAt: { not: prisma.visitorSession.fields.createdAt }
        }
      }),
      // Device groupings
      prisma.visitorSession.groupBy({
        by: ['device'],
        where: { createdAt: { gte: start, lte: end } },
        _count: { device: true },
      }),
      // Location state groupings
      prisma.visitorSession.groupBy({
        by: ['state', 'city'],
        where: { createdAt: { gte: start, lte: end } },
        _count: { sessionId: true },
        orderBy: { _count: { sessionId: 'desc' } },
        take: 10,
      }),
    ]);

    const nonLoggedInSessions = totalSessions - uniqueUsers;
    const conversionRate = totalSessions > 0 ? (totalSignups / totalSessions) * 100 : 0;
    const returningUsersRate = totalSessions > 0 ? (returningSessionsCount / totalSessions) * 100 : 0;
    const newUsersCount = totalSessions - returningSessionsCount;

    return {
      success: true,
      summary: {
        totalVisitors: totalSessions,
        loggedInUsers: uniqueUsers,
        nonLoggedInVisitors: nonLoggedInSessions,
        totalSignups,
        totalLogins,
        conversionRate: Math.round(conversionRate * 100) / 100,
        returningUsers: returningSessionsCount,
        newUsers: newUsersCount,
        returningRate: Math.round(returningUsersRate * 100) / 100,
      },
      devices: deviceCounts.map(d => ({ device: d.device, count: d._count.device })),
      locations: locationCounts.map(l => ({ state: l.state, city: l.city, count: l._count.sessionId })),
    };
  } catch (error) {
    console.error('Error fetching admin summary:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// =========================================================================
// 6. TRAFFIC SOURCE REPORT
// =========================================================================
export async function getTrafficSourceReport(rangeType: string, customStart?: string, customEnd?: string) {
  try {
    if (!(await checkSuperAdminAuthorized())) {
      return { success: false, error: 'Unauthorized' };
    }

    const { start, end } = getDateRange(rangeType, customStart, customEnd);

    // Group visitor sessions by Referrer
    const rawSources = await prisma.visitorSession.groupBy({
      by: ['referrer'],
      where: { createdAt: { gte: start, lte: end } },
      _count: { sessionId: true },
      orderBy: { _count: { sessionId: 'desc' } }
    });

    const report = await Promise.all(
      rawSources.map(async (source) => {
        // Count signups associated with sessions from this source
        const signupCount = await prisma.analyticsEvent.count({
          where: {
            createdAt: { gte: start, lte: end },
            eventType: 'signup',
            session: { referrer: source.referrer }
          }
        });

        // Count logins associated with sessions from this source
        const loginCount = await prisma.analyticsEvent.count({
          where: {
            createdAt: { gte: start, lte: end },
            eventType: 'login',
            session: { referrer: source.referrer }
          }
        });

        const totalVisitors = source._count.sessionId;
        const conversionPercentage = totalVisitors > 0 ? (signupCount / totalVisitors) * 100 : 0;

        return {
          source: source.referrer || 'Direct Visit',
          visitors: totalVisitors,
          signups: signupCount,
          logins: loginCount,
          conversion: Math.round(conversionPercentage * 10) / 10,
        };
      })
    );

    return { success: true, data: report };
  } catch (error) {
    console.error('Error compiling traffic source report:', error);
    return { success: false, error: 'Internal server error', data: [] };
  }
}

// =========================================================================
// 7. CONVERSION FUNNEL
// =========================================================================
export async function getFunnelData(rangeType: string, customStart?: string, customEnd?: string) {
  try {
    if (!(await checkSuperAdminAuthorized())) {
      return { success: false, error: 'Unauthorized' };
    }

    const { start, end } = getDateRange(rangeType, customStart, customEnd);

    const [visitors, signups, logins, activeEngaged] = await Promise.all([
      // Stage 1: Total visitors
      prisma.visitorSession.count({ where: { createdAt: { gte: start, lte: end } } }),
      // Stage 2: Signups
      prisma.analyticsEvent.count({ where: { createdAt: { gte: start, lte: end }, eventType: 'signup' } }),
      // Stage 3: Logins
      prisma.analyticsEvent.count({ where: { createdAt: { gte: start, lte: end }, eventType: 'login' } }),
      // Stage 4: Active / Engaged users (who triggered any engagement event)
      prisma.analyticsEvent.groupBy({
        by: ['sessionId'],
        where: {
          createdAt: { gte: start, lte: end },
          eventType: 'engagement'
        },
        _count: { sessionId: true }
      }).then(res => res.length)
    ]);

    return {
      success: true,
      data: [
        { stage: 'Visitors', count: visitors, percentage: 100 },
        { stage: 'Signups', count: signups, percentage: visitors > 0 ? Math.round((signups / visitors) * 100) : 0 },
        { stage: 'Logins', count: logins, percentage: signups > 0 ? Math.round((logins / signups) * 100) : 0 },
        { stage: 'Active Users', count: activeEngaged, percentage: logins > 0 ? Math.round((activeEngaged / logins) * 100) : 0 },
      ]
    };
  } catch (error) {
    console.error('Error fetching funnel data:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// =========================================================================
// 8. DAILY & HOURLY VISITOR GROWTH TRENDS
// =========================================================================
export async function getDailyTrends(rangeType: string, customStart?: string, customEnd?: string) {
  try {
    if (!(await checkSuperAdminAuthorized())) {
      return { success: false, error: 'Unauthorized' };
    }

    const { start, end } = getDateRange(rangeType, customStart, customEnd);

    const [sessions, signups, logins] = await Promise.all([
      prisma.visitorSession.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { createdAt: true }
      }),
      prisma.analyticsEvent.findMany({
        where: { createdAt: { gte: start, lte: end }, eventType: 'signup' },
        select: { createdAt: true }
      }),
      prisma.analyticsEvent.findMany({
        where: { createdAt: { gte: start, lte: end }, eventType: 'login' },
        select: { createdAt: true }
      }),
    ]);

    // Grouping helper by Date string (YYYY-MM-DD)
    const trendsMap: { [key: string]: { date: string; visitors: number; signups: number; logins: number } } = {};

    // Initialize all dates in the range
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      trendsMap[dateStr] = { date: dateStr, visitors: 0, signups: 0, logins: 0 };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Populate counts
    sessions.forEach(s => {
      const dateStr = s.createdAt.toISOString().split('T')[0];
      if (trendsMap[dateStr]) trendsMap[dateStr].visitors++;
    });

    signups.forEach(s => {
      const dateStr = s.createdAt.toISOString().split('T')[0];
      if (trendsMap[dateStr]) trendsMap[dateStr].signups++;
    });

    logins.forEach(s => {
      const dateStr = s.createdAt.toISOString().split('T')[0];
      if (trendsMap[dateStr]) trendsMap[dateStr].logins++;
    });

    const trends = Object.values(trendsMap).sort((a, b) => a.date.localeCompare(b.date));

    // Hourly traffic distribution (active hours summary)
    const hourlyTraffic = Array(24).fill(0);
    sessions.forEach(s => {
      const hour = s.createdAt.getHours();
      hourlyTraffic[hour]++;
    });

    return {
      success: true,
      trends,
      hourly: hourlyTraffic.map((count, hour) => ({ hour: `${hour}:00`, count })),
    };
  } catch (error) {
    console.error('Error fetching trend reports:', error);
    return { success: false, error: 'Internal server error', trends: [], hourly: [] };
  }
}

// =========================================================================
// 9. LOCATION & USER ENGAGEMENT METRICS
// =========================================================================
export async function getEngagementAndGeoReports(rangeType: string, customStart?: string, customEnd?: string) {
  try {
    if (!(await checkSuperAdminAuthorized())) {
      return { success: false, error: 'Unauthorized' };
    }

    const { start, end } = getDateRange(rangeType, customStart, customEnd);

    // Grouping by pages/paths to track feature engagement
    const pageHits = await prisma.analyticsEvent.groupBy({
      by: ['path'],
      where: {
        createdAt: { gte: start, lte: end },
        eventType: 'page_view'
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 8
    });

    // Grouping by engagement events
    const featureActions = await prisma.analyticsEvent.groupBy({
      by: ['path', 'details'],
      where: {
        createdAt: { gte: start, lte: end },
        eventType: 'engagement'
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    });

    const engagementReport = pageHits.map(hit => ({
      feature: hit.path === '/' ? 'Home Page' : hit.path,
      views: hit._count.id,
    }));

    return {
      success: true,
      engagement: engagementReport,
      featureActions: featureActions.map(act => ({
        path: act.path,
        action: act.details ? JSON.parse(act.details).action || 'interaction' : 'interaction',
        count: act._count.id,
      })),
    };
  } catch (error) {
    console.error('Error fetching engagement reports:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// =========================================================================
// 10. REALTIME DASHBOARD ONLINE USERS COUNTERS
// =========================================================================
export async function getRealtimeStats() {
  try {
    if (!(await checkSuperAdminAuthorized())) {
      return { success: false, error: 'Unauthorized' };
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // active sessions (updated within the last 5 minutes)
    const onlineSessionsCount = await prisma.visitorSession.count({
      where: { updatedAt: { gte: fiveMinutesAgo } }
    });

    // active logged-in users online in the last 5 minutes
    const onlineLoggedInCount = await prisma.visitorSession.count({
      where: {
        updatedAt: { gte: fiveMinutesAgo },
        userId: { not: null }
      }
    });

    // active realtime event hits in the last 1 minute (traffic activity speed)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentHitsCount = await prisma.analyticsEvent.count({
      where: { createdAt: { gte: oneMinuteAgo } }
    });

    return {
      success: true,
      onlineUsers: onlineSessionsCount,
      onlineLoggedIn: onlineLoggedInCount,
      trafficVelocity: recentHitsCount, // hits per minute
    };
  } catch (error) {
    console.error('Error fetching realtime stats:', error);
    return { success: false, onlineUsers: 0, onlineLoggedIn: 0, trafficVelocity: 0 };
  }
}
