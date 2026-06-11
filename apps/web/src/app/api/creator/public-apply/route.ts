import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fullName, mobile, email, city, country,
      instagramLink, youtubeLink, otherLink,
      followersRange, niche,
      utmSource, utmCampaign, referrerUrl,
    } = body;

    if (!fullName || !mobile) {
      return NextResponse.json({ error: 'Name and mobile number are required' }, { status: 400 });
    }

    const lead = await prisma.publicCreatorLead.create({
      data: {
        fullName,
        mobile,
        email: email || null,
        city: city || null,
        country: country || 'India',
        instagramLink: instagramLink || null,
        youtubeLink: youtubeLink || null,
        otherLink: otherLink || null,
        followersRange: followersRange || null,
        niche: Array.isArray(niche) ? niche.join(',') : (niche || null),
        utmSource: utmSource || null,
        utmCampaign: utmCampaign || null,
        referrerUrl: referrerUrl || null,
        status: 'new',
      },
    });

    // Log audit trail (non-critical)
    await prisma.auditLog.create({
      data: {
        action: 'PUBLIC_CREATOR_LEAD_SUBMITTED',
        details: `New public creator lead: ${fullName} (${mobile}) via ${utmSource || 'direct'}`,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, leadId: lead.id });
  } catch (error: any) {
    console.error('[Public Creator Apply]', error);
    return NextResponse.json({ error: 'Failed to submit. Please try again.' }, { status: 500 });
  }
}
