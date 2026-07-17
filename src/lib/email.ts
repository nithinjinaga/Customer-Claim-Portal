import { Resend } from "resend";

const BLUE = "#2461ac";
const GREEN = "#65bc46";
const NAVY = "#154074";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const RESPONSE_TIMELINE = "within 3 business days";

function shell(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f5f7fa;font-family:Arial,Helvetica,sans-serif;color:#16232e">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #dbe3ea;border-radius:6px;overflow:hidden">
      <tr><td style="padding:20px 28px;border-bottom:3px solid ${GREEN}">
        <img src="${appUrl()}/logo.png" alt="Premier Energies" width="150" style="display:block">
      </td></tr>
      <tr><td style="padding:28px">
        <h1 style="margin:0 0 16px;font-size:20px;color:${NAVY}">${title}</h1>
        ${body}
      </td></tr>
      <tr><td style="padding:16px 28px;background:#f5f7fa;border-top:1px solid #dbe3ea;font-size:12px;color:#5b6b7b">
        Premier Energies Limited, Hyderabad, India · Customer Service Portal
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

const p = (t: string) => `<p style="margin:0 0 12px;font-size:14px;line-height:1.6">${t}</p>`;
const button = (href: string, label: string) =>
  `<p style="margin:20px 0"><a href="${href}" style="background:${BLUE};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:bold;display:inline-block">${label}</a></p>`;

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email stub] To: ${to} | Subject: ${subject}`);
    return;
  }
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Premier Energies <onboarding@resend.dev>",
    to,
    subject,
    html,
  });
  if (error) console.error("[email] send failed:", error);
}

// --- Templates ---

export function welcomeEmail(name: string) {
  return shell(
    `Welcome, ${esc(name)}`,
    p("Your Premier Energies Customer Service Portal account is ready.") +
      p("Use the portal to raise complaints about your solar modules and track their resolution in real time.") +
      button(`${appUrl()}/login`, "Log in to the portal"),
  );
}

export function complaintConfirmationEmail(name: string, complaintId: string, summary: string) {
  return shell(
    "Complaint registered",
    p(`Dear ${esc(name)},`) +
      p(`Your complaint has been raised with ID <strong style="color:${NAVY}">${esc(complaintId)}</strong>.`) +
      `<div style="background:#f5f7fa;border:1px solid #dbe3ea;border-radius:6px;padding:14px;margin:0 0 12px;font-size:13px;line-height:1.6">${summary}</div>` +
      p("Your complaint has been raised and is being reviewed by our after-sales team. You will receive updates on the status via email.") +
      p(`Expected first response: <strong>${RESPONSE_TIMELINE}</strong>.`) +
      button(`${appUrl()}/track?id=${encodeURIComponent(complaintId)}`, "Track status"),
  );
}

export function statusUpdateEmail(name: string, complaintId: string, status: string, note?: string) {
  return shell(
    `Update on complaint ${esc(complaintId)}`,
    p(`Dear ${esc(name)},`) +
      p(`The status of your complaint <strong>${esc(complaintId)}</strong> is now <strong style="color:${GREEN}">${esc(status)}</strong>.`) +
      (note ? p(`Note from our team: ${esc(note)}`) : "") +
      button(`${appUrl()}/track?id=${encodeURIComponent(complaintId)}`, "View details"),
  );
}

export function passwordResetEmail(name: string, token: string) {
  return shell(
    "Reset your password",
    p(`Dear ${esc(name)},`) +
      p("We received a request to reset your portal password. The link below is valid for 1 hour.") +
      button(`${appUrl()}/reset-password?token=${encodeURIComponent(token)}`, "Reset password") +
      p("If you did not request this, you can safely ignore this email."),
  );
}

export function internalNewComplaintEmail(complaintId: string, detailsHtml: string) {
  return shell(
    `New complaint ${esc(complaintId)}`,
    p("A new complaint has been submitted on the customer portal.") +
      detailsHtml +
      button(`${appUrl()}/admin/complaint/${encodeURIComponent(complaintId)}`, "Open in admin panel"),
  );
}

export { esc, p as emailP };
