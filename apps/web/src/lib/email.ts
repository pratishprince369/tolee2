import { Resend } from 'resend';
import { prisma } from './prisma';

const resend = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'YOUR_RESEND_API_KEY'
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  emailType: 'verification' | 'password_reset' | 'creator_approval' | 'feedback'
): Promise<boolean> {
  console.log(`[Email Service] Initiating send to ${to} | Subject: ${subject} | Type: ${emailType}`);

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';

  // Fallback to console logging if API key is missing or is the default placeholder
  if (!apiKey || apiKey === 'YOUR_RESEND_API_KEY' || apiKey.trim() === '') {
    console.warn(`[Email Service] RESEND_API_KEY not set. OTP logged to console below.`);
    console.log(`\n================== MOCK RESEND EMAIL ==================`);
    console.log(`FROM: ${fromEmail}`);
    console.log(`TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`CONTENT: ${html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}`);
    console.log(`=======================================================\n`);

    try {
      await prisma.emailLog.create({
        data: {
          emailType,
          to,
          status: 'sent',
        },
      });
    } catch (dbErr) {
      console.error('[Email Service] Failed to write mock email log to database:', dbErr);
    }
    return true;
  }

  try {
    if (!resend) {
      throw new Error('Resend client was not properly initialized');
    }

    const brandedHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f6f9fc; padding: 40px 0;">
    <tr>
      <td align="center">
        <!-- Card Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border: 1px solid #e8eef2;">
          
          <!-- Header (Brand Banner) -->
          <tr>
            <td align="center" style="background-color: #0a7c85; padding: 28px 20px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background-color: #ffffff; width: 38px; height: 38px; border-radius: 10px; font-size: 20px; font-weight: 900; color: #0a7c85; line-height: 38px; text-align: center;">
                    t
                  </td>
                  <td style="font-size: 22px; font-weight: 800; color: #ffffff; padding-left: 10px; letter-spacing: -0.5px;">
                    Tolee
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content Body -->
          <tr>
            <td style="padding: 40px 32px; background-color: #ffffff;">
              ${html}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                Tolee Social Network
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                Connect with local interest groups and discover what's happening around you.<br>
                <a href="https://tolee.in" style="color: #0a7c85; text-decoration: none; font-weight: 600;">tolee.in</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html: brandedHtml,
    });

    if (error) {
      console.error('[Email Service] Resend API error response:', error);
      try {
        await prisma.emailLog.create({
          data: {
            emailType,
            to,
            status: 'failed',
            error: typeof error === 'object' ? JSON.stringify(error) : String(error),
          },
        });
      } catch (dbErr) {
        console.error('[Email Service] Failed to log failed email send:', dbErr);
      }
      return false;
    }

    try {
      await prisma.emailLog.create({
        data: {
          emailType,
          to,
          status: 'sent',
        },
      });
    } catch (dbErr) {
      console.error('[Email Service] Failed to log successful email send:', dbErr);
    }

    return true;
  } catch (err: any) {
    console.error('[Email Service] Exception sending email:', err);
    try {
      await prisma.emailLog.create({
        data: {
          emailType,
          to,
          status: 'failed',
          error: err.message || String(err),
        },
      });
    } catch (dbErr) {
      console.error('[Email Service] Failed to log exception email send:', dbErr);
    }
    return false;
  }
}

export async function sendOtp(email: string, otp: string, subject = 'Verify Your Tolee Account'): Promise<boolean> {
  const html = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 800; color: #1e293b; line-height: 1.3; text-align: center;">
      Verify Your Email
    </h2>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6; font-weight: 500; text-align: center;">
      Please use the 6-digit OTP code below to verify your Tolee account.
    </p>
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td align="center" style="background-color: #f1f7f8; border: 2px dashed #0a7c85; border-radius: 12px; padding: 20px; text-align: center;">
          <div style="font-size: 11px; font-weight: 700; color: #0a7c85; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
            Verification Code
          </div>
          <div style="font-size: 36px; font-weight: 800; color: #0a7c85; letter-spacing: 6px; font-family: monospace, sans-serif; line-height: 1;">
            ${otp}
          </div>
        </td>
      </tr>
    </table>
    <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5; text-align: center;">
      This code is valid for <strong>10 minutes</strong>. If you did not request this, you can safely ignore this email.
    </p>
  `;
  return sendEmail(email, subject, html, 'verification');
}

