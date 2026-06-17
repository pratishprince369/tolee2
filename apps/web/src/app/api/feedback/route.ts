import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { description, screenshotUrl, contactEmail } = body;

    if (!description || description.trim() === '') {
      return NextResponse.json({ success: false, error: 'Description is required' }, { status: 400 });
    }

    const userEmail = session?.user?.email || 'Anonymous';
    const userName = session?.user?.name || 'Anonymous';
    const userId = (session?.user as any)?.id || 'N/A';

    // HTML Content for the email
    const emailHtml = `
      <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0a7c85; margin-bottom: 24px; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; font-weight: 800; font-size: 22px;">
          📝 New User Feedback / Bug Report
        </h2>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px; font-weight: bold; width: 180px; border-bottom: 1px solid #f1f5f9;">Logged-in User Name</td>
            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">${userName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #f1f5f9;">Logged-in Email</td>
            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">${userEmail}</td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #f1f5f9;">User ID</td>
            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;"><code>${userId}</code></td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #f1f5f9;">Contact Email Provided</td>
            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">${contactEmail || 'N/A'}</td>
          </tr>
        </table>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #0a7c85; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
          <h3 style="margin-top: 0; margin-bottom: 8px; color: #0a7c85; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Problem Description</h3>
          <p style="margin: 0; line-height: 1.6; white-space: pre-wrap; font-size: 15px;">${description}</p>
        </div>
        
        ${screenshotUrl ? `
          <div style="margin-top: 24px;">
            <h3 style="color: #0a7c85; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Screenshot / Error Proof</h3>
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; max-width: 100%;">
              <a href="${screenshotUrl}" target="_blank" style="display: block;">
                <img src="${screenshotUrl}" alt="Feedback Screenshot" style="width: 100%; max-width: 100%; height: auto; display: block;" />
              </a>
            </div>
            <p style="font-size: 12px; color: #64748b; margin-top: 8px; text-align: center;">
              Click image to open high-resolution link: <a href="${screenshotUrl}" target="_blank" style="color: #0a7c85; text-decoration: underline;">${screenshotUrl}</a>
            </p>
          </div>
        ` : `
          <p style="color: #64748b; font-style: italic; font-size: 14px;">No screenshot attached.</p>
        `}
      </div>
    `;

    // Send email using our sendEmail utility to pratishtolee@gmail.com
    const emailSent = await sendEmail(
      'pratishtolee@gmail.com',
      `🚨 [Tolee Bug/Feedback] reported by ${userName}`,
      emailHtml,
      'feedback'
    );

    if (emailSent) {
      return NextResponse.json({ success: true, message: 'Feedback email sent successfully' });
    } else {
      return NextResponse.json({ success: false, error: 'Failed to send feedback email' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[Feedback Route Error]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
