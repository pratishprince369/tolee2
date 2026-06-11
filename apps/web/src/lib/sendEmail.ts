import nodemailer from 'nodemailer';

export async function sendOTPEmail(to: string, otp: string): Promise<boolean> {
  console.log(`[SUPER ADMIN OTP] Email: ${to} | OTP: ${otp}`);

  const smtpPass = process.env.SMTP_PASS;

  if (!smtpPass) {
    console.warn('[EMAIL] SMTP_PASS not set. OTP logged to console only.');
    return true;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: `"Tolee Super Admin" <${process.env.SMTP_USER}>`,
      to,
      subject: '🔐 Your Tolee Super Admin OTP',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#09090b;color:#fff;border-radius:16px;padding:32px;">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="color:#22c55e;font-size:28px;margin:0;">Tolee</h1>
            <p style="color:#71717a;margin:4px 0;">Super Admin Access</p>
          </div>
          <h2 style="font-size:20px;color:#fff;margin-bottom:8px;">Your One-Time Password</h2>
          <p style="color:#a1a1aa;">Use the following OTP to access the Super Admin Dashboard. It expires in <strong style="color:#fff">10 minutes</strong>.</p>
          <div style="background:#18181b;border:2px solid #22c55e;border-radius:12px;text-align:center;padding:24px;margin:24px 0;">
            <span style="font-size:48px;font-weight:900;letter-spacing:12px;color:#22c55e;">${otp}</span>
          </div>
          <p style="color:#71717a;font-size:12px;">If you did not request this, someone may be attempting to access your admin panel. Do NOT share this OTP.</p>
          <hr style="border-color:#27272a;margin:24px 0;"/>
          <p style="color:#52525b;font-size:11px;text-align:center;">Tolee.in · Super Admin Security</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error('[EMAIL] Failed to send OTP email:', err);
    return false;
  }
}
