import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createSystemNotification } from '@/lib/notification-service';
import { sendEmail } from '@/lib/email';

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;
const WALLET_CREDIT_AMOUNT = 20000;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).email !== SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { action, tier, adminNotes, giveWalletCredit, giveVerifiedBadge } = body;
    // action: "approve" | "reject"

    const application = await prisma.creatorApplication.findUnique({
      where: { id },
      include: { user: { include: { wallet: true } } }
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const now = new Date();

    // Update application
    const updatedApplication = await prisma.creatorApplication.update({
      where: { id },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
        creatorTier: action === 'approve' ? (tier || 'creator') : null,
        adminNotes: adminNotes || null,
        approvedAt: action === 'approve' ? now : null,
        rejectedAt: action === 'reject' ? now : null,
        walletCreditGiven: action === 'approve' && giveWalletCredit ? true : application.walletCreditGiven,
      }
    });

    // Update User fields
    await prisma.user.update({
      where: { id: application.userId },
      data: {
        isCreator: action === 'approve',
        creatorStatus: action === 'approve' ? 'approved' : 'rejected',
        creatorTier: action === 'approve' ? (tier || 'creator') : null,
        isVerified: giveVerifiedBadge ? true : undefined,
      }
    });

    // Give wallet credit if approved + requested
    if (action === 'approve' && giveWalletCredit && !application.walletCreditGiven) {
      if (application.user.wallet) {
        await prisma.wallet.update({
          where: { userId: application.userId },
          data: { balance: { increment: WALLET_CREDIT_AMOUNT } }
        });
        // Log transaction
        await prisma.transaction.create({
          data: {
            userId: application.userId,
            type: 'credit',
            amount: WALLET_CREDIT_AMOUNT,
            description: `🏆 Creator Program Welcome Bonus — ₹${WALLET_CREDIT_AMOUNT.toLocaleString()} Ads Wallet Credit`,
            status: 'completed',
          }
        }).catch(() => {});
      }
    }

    // Send in-app notification to creator using unified notification service
    await createSystemNotification({
      userId: application.userId,
      type: 'promotion',
      message: action === 'approve'
        ? `🎉 Congratulations! Your Creator application has been approved. You are now a ${tier || 'Creator'} on Tolee!${giveWalletCredit ? ' ₹20,000 Ads Wallet credit has been added to your Ads Wallet!' : ''}`
        : `Your Creator application was reviewed. Unfortunately, it was not approved at this time. ${adminNotes ? `Reason: ${adminNotes}` : ''}`,
      link: action === 'approve' ? '/creator-dashboard' : '/creator-program',
    }).catch((err) => console.error('[Creator Approve Notification error]', err));

    // Send email on approval
    if (action === 'approve') {
      const isGoldenCard = tier === 'verified_creator' || tier === 'premium_partner';
      await sendEmail(
        application.email,
        'Congratulations! Your Creator Application has been Approved!',
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
            <h2 style="color: #7c3aed;">Congratulations! 🎊</h2>
            <p>Your application to the Tolee Creator Program has been approved!</p>
            <p>You are now officially a <strong>${tier || 'Creator'}</strong> on Tolee.</p>
            ${giveWalletCredit ? '<p><strong>Bonus:</strong> ₹20,000 Ads Wallet credit has been successfully added to your account!</p>' : ''}
            <p>Log in to your account now to access your new <strong>Creator Dashboard</strong> and explore all the premium features and viral boosting tools.</p>
            <br />
            <a href="https://www.tolee.in/creator-dashboard" style="display: inline-block; background: linear-gradient(135deg,#7c3aed,#4f46e5); color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Open Creator Dashboard</a>
            <br /><br />
            <p>Best regards,<br/>The Tolee Team</p>
          </div>
        `,
        'creator_approval'
      ).catch((err) => {
        console.error('[Creator Approval Email Send Error]', err);
      });
    }

    return NextResponse.json({ success: true, application: updatedApplication });
  } catch (error: any) {
    console.error('[Admin Creator PATCH]', error);
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }
}
