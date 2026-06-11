import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySuperAdminToken, SUPER_ADMIN_COOKIE } from '@/lib/superAdminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const campaigns = await prisma.adCampaign.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ campaigns });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const body = await req.json();
  try {
    const campaign = await prisma.adCampaign.create({
      data: {
        name: body.name,
        type: body.type || 'sponsored',
        contentId: body.contentId,
        contentType: body.contentType,
        customCaption: body.customCaption,
        customImageUrl: body.customImageUrl,
        targetLocations: body.targetLocations ? JSON.stringify(body.targetLocations) : null,
        impressionsPerUserPerDay: body.impressionsPerUserPerDay || 1,
        totalImpressionsLimit: body.totalImpressionsLimit || 10000,
        priorityLevel: body.priorityLevel || 1,
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        endDate: body.endDate ? new Date(body.endDate) : null,
      }
    });
    await prisma.auditLog.create({ data: { action: 'create_campaign', target: campaign.id, targetType: 'campaign', ipAddress: ip } });
    return NextResponse.json({ success: true, campaign });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id, status } = await req.json();
  const campaign = await prisma.adCampaign.update({ where: { id }, data: { status } });
  return NextResponse.json({ success: true, campaign });
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await req.json();
  await prisma.adCampaign.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
