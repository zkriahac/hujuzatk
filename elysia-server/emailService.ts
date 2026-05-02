/**
 * Resend email service — all sends are fire-and-forget (non-blocking).
 * A failed email never breaks the main GraphQL response.
 */
import { Resend } from 'resend';

const resend = new Resend((process.env.RESEND_API_KEY || '').trim());
const FROM   = (process.env.RESEND_FROM  || 'Hujuzatk PMS <noreply@hujuzatk.com>').trim();
const ADMIN  = (process.env.ADMIN_EMAIL  || 'zkriahagmohamad@gmail.com').trim();
const APP    = (process.env.APP_URL      || 'https://hujuzatk.com').trim().replace(/\/$/, '');

// ---------------------------------------------------------------------------
// Base HTML template
// ---------------------------------------------------------------------------
function html(body: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:40px auto 60px">
    <div style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06)">
      <div style="background:linear-gradient(135deg,#059669 0%,#0d9488 100%);padding:28px 32px">
        <div style="color:#fff;font-size:20px;font-weight:900;letter-spacing:-0.4px">Hujuzatk PMS</div>
        <div style="color:#a7f3d0;font-size:12px;margin-top:3px;font-weight:600">Professional Property Management</div>
      </div>
      <div style="padding:32px">${body}</div>
      <div style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8">
        © ${new Date().getFullYear()} Hujuzatk PMS &nbsp;·&nbsp;
        <a href="${APP}" style="color:#059669;text-decoration:none">hujuzatk.com</a>
      </div>
    </div>
  </div>
</body></html>`;
}

function h2(text: string) {
  return `<h2 style="margin:0 0 6px;color:#0f172a;font-size:18px;font-weight:900">${text}</h2>`;
}
function p(text: string, sub = false) {
  return `<p style="margin:0 0 20px;font-size:${sub ? '13' : '14'}px;color:${sub ? '#64748b' : '#334155'};line-height:1.6">${text}</p>`;
}
function row(label: string, value: string) {
  return `<tr>
    <td style="padding:7px 0;font-size:13px;color:#64748b;width:130px;vertical-align:top">${label}</td>
    <td style="padding:7px 0;font-size:13px;font-weight:700;color:#0f172a">${value}</td>
  </tr>`;
}
function table(...rows: string[]) {
  return `<table style="width:100%;border-collapse:collapse;margin-bottom:24px">${rows.join('')}</table>`;
}
function badge(text: string, color = '#059669') {
  return `<span style="background:${color}18;color:${color};padding:3px 10px;border-radius:6px;font-size:12px;font-weight:700">${text}</span>`;
}
function btn(text: string, href: string) {
  return `<a href="${href}" style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;margin-top:4px">${text}</a>`;
}

// ---------------------------------------------------------------------------
// 1. New tenant registered → admin
// ---------------------------------------------------------------------------
export async function sendNewTenantEmail(
  tenant: { name: string; email: string; phone?: string | null },
): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM,
      to: ADMIN,
      subject: `🎉 New signup: ${tenant.name}`,
      html: html(
        h2('New User Registered') +
        table(
          row('Name',  tenant.name),
          row('Email', tenant.email),
          row('Phone', tenant.phone || '—'),
          row('Plan',  badge('TRIAL')),
        ) +
        btn('Open Admin Panel', `${APP}/superadmin`),
      ),
    });
  } catch { /* non-blocking */ }
}

// ---------------------------------------------------------------------------
// 2. Subscription activated → tenant + admin
// ---------------------------------------------------------------------------
export async function sendPlanActivatedEmail(
  tenant: { name: string; email: string },
  days: number,
  validUntil: Date,
): Promise<void> {
  const dateStr = validUntil.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // To tenant
  try {
    await resend.emails.send({
      from: FROM,
      to: tenant.email,
      subject: '✅ Your Hujuzatk subscription is now active',
      html: html(
        h2('Subscription Activated') +
        p(`Hi ${tenant.name}, your subscription has been activated and you now have full access.`) +
        table(
          row('Status',      badge('ACTIVE')),
          row('Days granted', `${days} days`),
          row('Valid until',  dateStr),
        ) +
        btn('Open Hujuzatk', APP),
      ),
    });
  } catch {}

  // To admin
  try {
    await resend.emails.send({
      from: FROM,
      to: ADMIN,
      subject: `✅ Subscription activated: ${tenant.name}`,
      html: html(
        h2('Subscription Activated') +
        table(
          row('Tenant',      tenant.name),
          row('Email',       tenant.email),
          row('Days granted', `${days} days`),
          row('Valid until',  dateStr),
          row('Status',      badge('ACTIVE')),
        ),
      ),
    });
  } catch {}
}

// ---------------------------------------------------------------------------
// 3. Subscription canceled → tenant + admin
// ---------------------------------------------------------------------------
export async function sendPlanCanceledEmail(
  tenant: { name: string; email: string },
): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM,
      to: tenant.email,
      subject: '⚠️ Your Hujuzatk subscription has been canceled',
      html: html(
        h2('Subscription Canceled') +
        p(`Hi ${tenant.name}, your subscription has been canceled and access has been disabled.`) +
        p('If you think this is a mistake or would like to renew, please contact support via WhatsApp.', true) +
        btn('Contact Support on WhatsApp', 'https://wa.me/905523205496'),
      ),
    });
  } catch {}

  try {
    await resend.emails.send({
      from: FROM,
      to: ADMIN,
      subject: `⚠️ Subscription canceled: ${tenant.name}`,
      html: html(
        h2('Subscription Canceled') +
        table(
          row('Tenant', tenant.name),
          row('Email',  tenant.email),
          row('Status', badge('CANCELED', '#ef4444')),
        ),
      ),
    });
  } catch {}
}

// ---------------------------------------------------------------------------
// 4. Plan tier changed (basic / pro / enterprise) → tenant + admin
// ---------------------------------------------------------------------------
export async function sendPlanChangedEmail(
  tenant: { name: string; email: string },
  plan: string,
): Promise<void> {
  const planLabel = plan.toUpperCase();

  try {
    await resend.emails.send({
      from: FROM,
      to: tenant.email,
      subject: `🔄 Your Hujuzatk plan has been updated to ${planLabel}`,
      html: html(
        h2('Plan Updated') +
        p(`Hi ${tenant.name}, your plan has been changed.`) +
        table(
          row('New plan', badge(planLabel, plan === 'trial' ? '#f59e0b' : '#059669')),
        ) +
        btn('Open Hujuzatk', APP),
      ),
    });
  } catch {}

  try {
    await resend.emails.send({
      from: FROM,
      to: ADMIN,
      subject: `🔄 Plan changed to ${planLabel}: ${tenant.name}`,
      html: html(
        h2('Plan Changed') +
        table(
          row('Tenant',   tenant.name),
          row('Email',    tenant.email),
          row('New plan', badge(planLabel, plan === 'trial' ? '#f59e0b' : '#059669')),
        ),
      ),
    });
  } catch {}
}

// ---------------------------------------------------------------------------
// 5. Password reset link → tenant
// ---------------------------------------------------------------------------
export async function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<void> {
  const resetUrl = `${APP}/reset-password?token=${encodeURIComponent(token)}`;
  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: '🔑 Reset your Hujuzatk password',
      html: html(
        h2('Reset Your Password') +
        p('Click the button below to set a new password. This link expires in <strong>1 hour</strong>.') +
        btn('Reset Password', resetUrl) +
        `<p style="margin-top:28px;font-size:11px;color:#94a3b8">
          If you didn't request this, you can safely ignore this email.<br>
          Or paste this URL into your browser:<br>
          <a href="${resetUrl}" style="color:#059669;word-break:break-all">${resetUrl}</a>
        </p>`,
      ),
    });
  } catch { /* non-blocking */ }
}
