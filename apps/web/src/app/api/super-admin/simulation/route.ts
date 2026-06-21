import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdminToken, SUPER_ADMIN_COOKIE } from '@/lib/superAdminAuth';
import { prisma } from '@/lib/prisma';
import { syncSimulationData } from '@/lib/simulation';

export const dynamic = 'force-dynamic';

// GET — fetch simulation configuration
export async function GET(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'global' } });
    
    // Return settings with safe defaults if null
    return NextResponse.json({
      success: true,
      settings: settings || {
        simulationMode: false,
        simulatedUsersCount: 100,
        simulatedPostsCount: 50,
        simulatedReelsCount: 50,
        minLikes: 100,
        maxLikes: 10000,
        minComments: 5,
        maxComments: 200,
        minViews: 1000,
        maxViews: 100000,
        minGroupMembers: 5000,
        maxGroupMembers: 5000000,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST — update simulation settings and sync mock data
export async function POST(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      simulationMode,
      simulatedUsersCount,
      simulatedPostsCount,
      simulatedReelsCount,
      minLikes,
      maxLikes,
      minComments,
      maxComments,
      minViews,
      maxViews,
      minGroupMembers,
      maxGroupMembers,
    } = body;

    // Save to SiteSettings singleton
    const settings = await prisma.siteSettings.upsert({
      where: { id: 'global' },
      update: {
        ...(simulationMode !== undefined && { simulationMode }),
        ...(simulatedUsersCount !== undefined && { simulatedUsersCount: parseInt(simulatedUsersCount) }),
        ...(simulatedPostsCount !== undefined && { simulatedPostsCount: parseInt(simulatedPostsCount) }),
        ...(simulatedReelsCount !== undefined && { simulatedReelsCount: parseInt(simulatedReelsCount) }),
        ...(minLikes !== undefined && { minLikes: parseInt(minLikes) }),
        ...(maxLikes !== undefined && { maxLikes: parseInt(maxLikes) }),
        ...(minComments !== undefined && { minComments: parseInt(minComments) }),
        ...(maxComments !== undefined && { maxComments: parseInt(maxComments) }),
        ...(minViews !== undefined && { minViews: parseInt(minViews) }),
        ...(maxViews !== undefined && { maxViews: parseInt(maxViews) }),
        ...(minGroupMembers !== undefined && { minGroupMembers: parseInt(minGroupMembers) }),
        ...(maxGroupMembers !== undefined && { maxGroupMembers: parseInt(maxGroupMembers) }),
      },
      create: {
        id: 'global',
        simulationMode: simulationMode || false,
        simulatedUsersCount: simulatedUsersCount !== undefined ? parseInt(simulatedUsersCount) : 100,
        simulatedPostsCount: simulatedPostsCount !== undefined ? parseInt(simulatedPostsCount) : 50,
        simulatedReelsCount: simulatedReelsCount !== undefined ? parseInt(simulatedReelsCount) : 50,
        minLikes: minLikes !== undefined ? parseInt(minLikes) : 100,
        maxLikes: maxLikes !== undefined ? parseInt(maxLikes) : 10000,
        minComments: minComments !== undefined ? parseInt(minComments) : 5,
        maxComments: maxComments !== undefined ? parseInt(maxComments) : 200,
        minViews: minViews !== undefined ? parseInt(minViews) : 1000,
        maxViews: maxViews !== undefined ? parseInt(maxViews) : 100000,
        minGroupMembers: minGroupMembers !== undefined ? parseInt(minGroupMembers) : 5000,
        maxGroupMembers: maxGroupMembers !== undefined ? parseInt(maxGroupMembers) : 5000000,
      },
    });

    // Run simulated database sync in background/synchronously
    const syncRes = await syncSimulationData();

    return NextResponse.json({
      success: true,
      settings,
      syncMessage: syncRes.message || 'Simulation data synced.',
      error: syncRes.error || null
    });
  } catch (error: any) {
    console.error('Error updating simulation mode:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
