export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export interface EmailTransport {
  send(msg: EmailMessage): Promise<void>;
}

// In-memory transport for tests
const inbox: EmailMessage[] = [];

class InMemoryTransport implements EmailTransport {
  async send(msg: EmailMessage): Promise<void> {
    inbox.push({ ...msg });
  }
}

class ResendTransport implements EmailTransport {
  private from: string;
  private apiKey: string;

  constructor(apiKey: string, from: string) {
    this.apiKey = apiKey;
    this.from = from;
  }

  async send(msg: EmailMessage): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Resend } = require('resend');
    const resend = new Resend(this.apiKey);
    await resend.emails.send({
      from: this.from,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
    });
  }
}

let transport: EmailTransport | null = null;

export function getEmailTransport(): EmailTransport {
  if (!transport) {
    if (process.env.RESEND_API_KEY) {
      transport = new ResendTransport(
        process.env.RESEND_API_KEY,
        process.env.EMAIL_FROM ?? 'noreply@fintrackbd.com'
      );
    } else {
      transport = new InMemoryTransport();
    }
  }
  return transport;
}

/** For tests: read emails sent since last clearTestInbox() */
export function getTestInbox(): EmailMessage[] {
  return inbox;
}

/** For tests: clear the inbox between test runs */
export function clearTestInbox(): void {
  inbox.length = 0;
  transport = null;
}

// ---------------------------------------------------------------------------
// Email templates — contain only the link; no personal or financial data
// ---------------------------------------------------------------------------

export function verificationEmailHtml(verificationUrl: string): string {
  return `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px"><h1 style="font-size:20px;margin:0 0 16px">Verify your email</h1><p style="margin:0 0 24px;color:#555">Click the link below to verify your email address and activate your account.</p><a href="${verificationUrl}" style="display:inline-block;padding:12px 24px;background:#3A5FCD;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Verify email</a><p style="margin:24px 0 0;color:#999;font-size:13px">This link expires in 24 hours. If you did not create an account, ignore this email.</p></div>`;
}

export function passwordResetEmailHtml(resetUrl: string): string {
  return `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px"><h1 style="font-size:20px;margin:0 0 16px">Reset your password</h1><p style="margin:0 0 24px;color:#555">Click the link below to reset your password.</p><a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#3A5FCD;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Reset password</a><p style="margin:24px 0 0;color:#999;font-size:13px">This link expires in 1 hour. If you did not request a password reset, ignore this email.</p></div>`;
}
