// Email delivery for OTP codes, via Resend (resend.com). A plain `fetch`
// call to Resend's REST API, same convention as the Gemini REST call in
// lib/ai-photo-enhance.ts - no need to pull in the `resend` npm package for
// a single "send one transactional email" request.
//
// Graceful degradation, matching the GEMINI_API_KEY convention in
// lib/ai-photo-enhance.ts: until RESEND_API_KEY is set (true for this pilot
// until a Resend account exists - see apps/web/.env.example), sendOtpEmail
// logs the code to the console instead of calling Resend, and reports
// delivered: false so lib/otp.ts knows to fall back to its current devOtp
// behavior. The moment RESEND_API_KEY is set, this starts sending real
// email with no other code changes required.
const RESEND_API_URL = "https://api.resend.com/emails";

// Resend's own sandbox sender - works immediately with just an API key, no
// domain verification needed. Override once a verified sending domain
// exists for this deployment.
const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? "SORT NOW <onboarding@resend.dev>";

/** True once a real email provider is configured - lib/otp.ts uses this to decide whether to keep echoing devOtp. */
export function isEmailDeliveryConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export type SendEmailResult = { delivered: true } | { delivered: false; reason: "not_configured" | "upstream_error" };

function otpEmailBody(code: string) {
  const text = `Your SORT NOW verification code is ${code}.\n\nIt expires in 5 minutes. Do not share this code with anyone.`;
  const html = `<div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #0f172a;">
  <p style="font-size: 15px; margin: 0 0 12px;">Your SORT NOW verification code is:</p>
  <p style="font-size: 34px; font-weight: 700; letter-spacing: 0.12em; margin: 0 0 16px;">${code}</p>
  <p style="font-size: 13px; color: #64748b; margin: 0;">It expires in 5 minutes. Do not share this code with anyone.</p>
</div>`;
  return { text, html };
}

// Shared Resend call - both sendOtpEmail and sendNotificationEmail below
// just build their own subject/text/html and hand it to this.
async function sendViaResend(to: string, subject: string, text: string, html: string, logContext: string): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[${logContext} -> ${to}] (dev mode, RESEND_API_KEY not set) ${subject}: ${text}`);
    return { delivered: false, reason: "not_configured" };
  }

  let response: Response;
  try {
    response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, text, html }),
    });
  } catch (err) {
    console.error(`[${logContext}] Couldn't reach Resend:`, err);
    return { delivered: false, reason: "upstream_error" };
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(`[${logContext}] Resend API error:`, response.status, detail);
    return { delivered: false, reason: "upstream_error" };
  }

  return { delivered: true };
}

/** Sends a 6-digit OTP code to `email` via Resend, or logs it to the console if RESEND_API_KEY isn't set yet. */
export async function sendOtpEmail(email: string, code: string): Promise<SendEmailResult> {
  const { text, html } = otpEmailBody(code);
  return sendViaResend(email, "Your SORT NOW verification code", text, html, "OTP EMAIL");
}

// Reuses the OTP email's own plain shell (a subject line, then the message
// as-is) rather than a bespoke template per trigger - the messages built in
// lib/seed-data.ts's notify() call sites (e.g. "New reservation from...",
// "Thanks for shopping with...") already read as complete, human-written
// notices, so wrapping them in one consistent shell is enough without
// maintaining a separate HTML template per trigger type.
function notificationEmailBody(message: string) {
  const html = `<div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #0f172a;">
  <p style="font-size: 15px; line-height: 1.5; margin: 0;">${message}</p>
</div>`;
  return { text: message, html };
}

/** Sends a real-event notification (reservation created/fulfilled/cancelled, etc.) to `email`, or logs it if RESEND_API_KEY isn't set yet. */
export async function sendNotificationEmail(email: string, subject: string, message: string): Promise<SendEmailResult> {
  const { text, html } = notificationEmailBody(message);
  return sendViaResend(email, subject, text, html, "NOTIFICATION EMAIL");
}
