import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   ?? 'smtp.gmail.com',
  port:   Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === 'true',
  // No login when no SMTP user is set (e.g. a local relay); a blank login is refused.
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
})

// Prefer an explicit EMAIL_FROM (e.g. `Rankkw Support <support@rankkw.online>`).
// Fall back to the authenticated SMTP user so the From address always matches
// the mailbox we log in as — providers like Namecheap Private Email reject a
// From that differs from the authenticated user.
const FROM = process.env.EMAIL_FROM || `"Rankkw" <${process.env.SMTP_USER ?? 'noreply@rankkw.online'}>`
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function sendOtpEmail(email: string, otp: string, type: 'reset' | 'verify') {
  const subject = type === 'reset' ? 'Reset your Rankkw password' : 'Verify your Rankkw account'
  const action  = type === 'reset' ? 'reset your password' : 'verify your account'

  await transporter.sendMail({
    from:    FROM,
    to:      email,
    subject,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#EEEBE1;font-family:'Inter',-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#F6F4EC;border-radius:16px;overflow:hidden;border:1px solid rgba(0,0,0,0.08)">
        <!-- Header -->
        <tr><td style="background:#3D3E3B;padding:28px 40px;text-align:center">
          <div style="font-size:22px;font-weight:600;color:#F6F4EC;letter-spacing:-0.5px">🌱 Rankkw</div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px">
          <h1 style="font-size:22px;font-weight:400;color:#3D3E3B;margin:0 0 12px;letter-spacing:-0.5px">${subject}</h1>
          <p style="font-size:14px;color:#666;line-height:1.65;margin:0 0 32px">
            We received a request to ${action}. Use the 6-digit code below. It expires in <strong>10 minutes</strong>.
          </p>
          <!-- OTP Box -->
          <div style="background:#EEEBE1;border-radius:12px;padding:24px;text-align:center;margin-bottom:32px">
            <div style="font-size:42px;font-weight:700;letter-spacing:12px;color:#FB5E09;font-family:'DM Sans',monospace">${otp}</div>
          </div>
          <p style="font-size:13px;color:#aaa;margin:0">
            If you didn't request this, you can safely ignore this email.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 40px;border-top:1px solid rgba(0,0,0,0.06);text-align:center">
          <p style="font-size:11px;color:#bbb;margin:0;font-family:monospace">
            © 2026 Rankkw. Not affiliated with Etsy, Inc.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

export async function sendWelcomeEmail(email: string, name: string) {
  await transporter.sendMail({
    from:    FROM,
    to:      email,
    subject: `Welcome to Rankkw, ${name}! 🌱`,
    html: `
<!DOCTYPE html><html><body style="font-family:'Inter',-apple-system,sans-serif;background:#EEEBE1;padding:40px 20px;margin:0">
<table width="480" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#F6F4EC;border-radius:16px;overflow:hidden;border:1px solid rgba(0,0,0,0.08)">
  <tr><td style="background:#3D3E3B;padding:28px 40px;text-align:center">
    <div style="font-size:22px;font-weight:600;color:#F6F4EC">🌱 Rankkw</div>
  </td></tr>
  <tr><td style="padding:40px">
    <h1 style="font-size:22px;font-weight:400;color:#3D3E3B;margin:0 0 12px">Welcome, ${name}!</h1>
    <p style="font-size:14px;color:#666;line-height:1.65;margin:0 0 24px">
      Your account is ready. Start researching Etsy keywords and growing your shop today.
    </p>
    <a href="${APP_URL}/dashboard" style="display:inline-block;background:#FB5E09;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:999px;font-size:14px;font-weight:500">
      Open Dashboard →
    </a>
  </td></tr>
</table>
</body></html>`,
  })
}

const escHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

/**
 * A message from the public contact form, delivered to the support inbox
 * (SUPPORT_EMAIL, else support@rankkw.online). Reply-To is the sender, so
 * answering it in the inbox goes straight back to them.
 */
export async function sendContactEmail(m: { name: string; email: string; subject: string; message: string; ip: string }) {
  const to = process.env.SUPPORT_EMAIL || 'support@rankkw.online'
  const text = `${m.message}\n\n--\nFrom: ${m.name} <${m.email}>\nSubject: ${m.subject}\nIP: ${m.ip}\nSent from the rankkw.online contact form`
  await transporter.sendMail({
    from: FROM,
    to,
    replyTo: `"${m.name.replace(/"/g, '')}" <${m.email}>`,
    subject: `[Contact] ${m.subject}: ${m.name}`,
    text,
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#111827">
      <p style="white-space:pre-wrap">${escHtml(m.message)}</p>
      <hr style="border:none;border-top:1px solid #E5E7EB">
      <p style="color:#6B7280;font-size:12.5px">From: ${escHtml(m.name)} &lt;${escHtml(m.email)}&gt;<br>Subject: ${escHtml(m.subject)}<br>IP: ${escHtml(m.ip)}<br>Sent from the rankkw.online contact form</p>
    </div>`,
  })
}
