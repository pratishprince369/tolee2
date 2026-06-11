import { Resend } from 'resend';
import { prisma } from './prisma';

const resend = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'YOUR_RESEND_API_KEY'
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  emailType: 'verification' | 'password_reset' | 'creator_approval'
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

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
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
