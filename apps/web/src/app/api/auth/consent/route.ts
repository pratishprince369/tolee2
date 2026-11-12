export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateAgeAndConsent } from '@/lib/ageValidation';

// GET — check if current authenticated user has completed age & consent verification
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ authenticated: false, hasConsent: false }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json({ authenticated: false, hasConsent: false }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        avatar: true,
        dateOfBirth: true,
        ageVerified: true,
        consentRecord: {
          select: {
            id: true,
            dateOfBirth: true,
            ageAtConsent: true,
            ageVerified: true,
            termsAccepted: true,
            privacyPolicyAccepted: true,
            communityGuidelinesAccepted: true,
            parentalConsentGranted: true,
            consentTimestamp: true,
            signupMethod: true,
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const hasConsent = Boolean(user.ageVerified && user.dateOfBirth && user.consentRecord);

    return NextResponse.json({
      authenticated: true,
      hasConsent,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image || user.avatar,
        dateOfBirth: user.dateOfBirth,
        ageVerified: user.ageVerified,
        consent: user.consentRecord,
      }
    });
  } catch (error: any) {
    console.error('[Consent Check GET]', error);
    return NextResponse.json({ error: error.message || 'Failed to check consent' }, { status: 500 });
  }
}

// POST — submit age verification & mandatory legal consent
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Please sign in first to complete your account setup.' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID missing from session.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      dateOfBirth,
      termsAccepted,
      privacyPolicyAccepted,
      communityGuidelinesAccepted,
      consentAccepted,
      parentalConsentGranted,
      signupMethod = 'Google'
    } = body;

    // Strict Backend Age & Consent Validation
    const validation = validateAgeAndConsent({
      dateOfBirth,
      termsAccepted: termsAccepted ?? consentAccepted,
      privacyPolicyAccepted: privacyPolicyAccepted ?? consentAccepted,
      communityGuidelinesAccepted: communityGuidelinesAccepted ?? consentAccepted,
      parentalConsentGranted,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null;

    // Update User & Upsert UserConsent Record
    const [updatedUser, consent] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          dateOfBirth: validation.parsedDob,
          ageVerified: true,
        }
      }),
      prisma.userConsent.upsert({
        where: { userId },
        create: {
          userId,
          dateOfBirth: validation.parsedDob!,
          ageAtConsent: validation.age,
          ageVerified: true,
          ageVerificationMethod: validation.isMinor ? 'parental_guardian_consent' : 'self_declaration_dob',
          parentalConsentGranted: validation.isMinor ? Boolean(parentalConsentGranted) : false,
          termsAccepted: true,
          privacyPolicyAccepted: true,
          communityGuidelinesAccepted: true,
          consentTimestamp: new Date(),
          consentIpAddress: clientIp,
          consentPolicyVersion: 'v1.0',
          signupMethod: signupMethod,
        },
        update: {
          dateOfBirth: validation.parsedDob!,
          ageAtConsent: validation.age,
          ageVerified: true,
          ageVerificationMethod: validation.isMinor ? 'parental_guardian_consent' : 'self_declaration_dob',
          parentalConsentGranted: validation.isMinor ? Boolean(parentalConsentGranted) : false,
          termsAccepted: true,
          privacyPolicyAccepted: true,
          communityGuidelinesAccepted: true,
          consentTimestamp: new Date(),
          consentIpAddress: clientIp,
          consentPolicyVersion: 'v1.0',
          signupMethod: signupMethod,
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      message: 'Account successfully verified and activated.',
      redirectUrl: '/feed',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        age: validation.age,
        ageVerified: true,
      }
    });
  } catch (error: any) {
    console.error('[Consent Submission POST]', error);
    return NextResponse.json({ error: error.message || 'Failed to submit consent' }, { status: 500 });
  }
}
