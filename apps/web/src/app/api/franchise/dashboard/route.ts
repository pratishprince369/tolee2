import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // 1. Get Franchise details
    const franchise = await prisma.franchise.findUnique({
      where: { userId }
    });

    if (!franchise) {
      return NextResponse.json({ 
        success: false,
        message: "No franchise profile found for this user account.",
        hasApplied: false
      });
    }

    if (franchise.status !== "active") {
      return NextResponse.json({
        success: true,
        hasApplied: true,
        status: franchise.status,
        franchise
      });
    }

    // 2. Fetch Clicks Stats
    const totalClicks = await prisma.franchiseClick.count({
      where: { franchiseId: franchise.id }
    });

    // 3. Fetch Referrals details
    const referrals = await prisma.referral.findMany({
      where: { franchiseId: franchise.id },
      include: {
        referee: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            createdAt: true,
            email_verified: true,
            phoneVerified: true,
            isMobileVerified: true,
            lastActiveAt: true,
            location: true,
            coverImage: true,
            image: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // 4. Calculate Active vs Pending Users based on engagement validation
    const activeReferees = referrals.filter(r => {
      const u = r.referee;
      if (!u) return false;
      const isVerified = u.email_verified || u.phoneVerified || u.isMobileVerified;
      const lastActiveRecent = u.lastActiveAt && (Date.now() - new Date(u.lastActiveAt).getTime()) < 30 * 24 * 60 * 60 * 1000;
      return isVerified || lastActiveRecent;
    });

    const activeCount = activeReferees.length;
    const pendingCount = referrals.length - activeCount;

    // 5. Daily, Weekly, Monthly Joins
    const now = Date.now();
    const dailyJoins = referrals.filter(r => (now - new Date(r.createdAt).getTime()) < 24 * 60 * 60 * 1000).length;
    const weeklyJoins = referrals.filter(r => (now - new Date(r.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000).length;
    const monthlyJoins = referrals.filter(r => (now - new Date(r.createdAt).getTime()) < 30 * 24 * 60 * 60 * 1000).length;

    // 6. Total referred users ad spend volume
    const refereeIds = referrals.map(r => r.refereeId);
    const wallets = await prisma.wallet.findMany({
      where: { userId: { in: refereeIds } },
      select: { totalSpent: true }
    });
    const totalAdVolume = wallets.reduce((sum, w) => sum + w.totalSpent, 0);

    // 7. Withdrawals Stats
    const withdrawals = await prisma.franchiseWithdrawal.findMany({
      where: { franchiseId: franchise.id },
      orderBy: { createdAt: "desc" }
    });

    // 8. Weekly stats for chart rendering (clicks vs signups in last 7 days)
    const chartData: { date: string; clicks: number; signups: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));

      const clicksCount = await prisma.franchiseClick.count({
        where: {
          franchiseId: franchise.id,
          createdAt: { gte: start, lte: end }
        }
      });

      const signupsCount = referrals.filter(r => {
        const t = new Date(r.createdAt).getTime();
        return t >= start.getTime() && t <= end.getTime();
      }).length;

      chartData.push({
        date: dateStr,
        clicks: clicksCount,
        signups: signupsCount
      });
    }

    // 9. Fetch current active slab
    const slabs = await prisma.franchiseSlab.findMany({
      orderBy: { minUsers: 'asc' }
    });

    let currentSlabPercent = 2.0;
    if (slabs.length > 0) {
      for (const slab of slabs) {
        if (activeCount >= slab.minUsers && activeCount <= slab.maxUsers) {
          currentSlabPercent = slab.commission;
          break;
        }
      }
    } else {
      if (activeCount < 20000) currentSlabPercent = 2.0;
      else if (activeCount < 50000) currentSlabPercent = 2.5;
      else if (activeCount < 100000) currentSlabPercent = 3.5;
      else currentSlabPercent = 5.0;
    }

    // 10. Fetch transaction logs
    const transactions = await prisma.franchiseTransaction.findMany({
      where: { franchiseId: franchise.id },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    return NextResponse.json({
      success: true,
      hasApplied: true,
      status: "active",
      franchise: {
        ...franchise,
        totalClicks,
        registeredCount: referrals.length,
        activeCount,
        pendingCount,
        dailyJoins,
        weeklyJoins,
        monthlyJoins,
        totalAdVolume,
        currentSlabPercent
      },
      referrals: referrals.map(r => ({
        id: r.id,
        createdAt: r.createdAt,
        device: r.device,
        location: r.location,
        state: r.state,
        city: r.city,
        area: r.area,
        source: r.source,
        referee: r.referee
      })),
      withdrawals,
      transactions,
      chartData
    });
  } catch (error: any) {
    console.error("[Franchise Stats API Error]:", error);
    return NextResponse.json({ message: error.message || "Failed to load dashboard data." }, { status: 500 });
  }
}
