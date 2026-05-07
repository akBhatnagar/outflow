import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

import { renderResetPasswordEmail, renderVerifyEmailEmail } from './templates';

export interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Opaque tag for logging only — never the recipient's PII. */
  category: string;
}

/**
 * Pluggable mail transport.
 *
 * - In dev (`MAIL_DRIVER=smtp`) we hit Mailhog or any other SMTP server. The
 *   composed message lives in Mailhog's UI at http://localhost:8025.
 * - In prod (`MAIL_DRIVER=resend`) we POST to the Resend HTTP API directly —
 *   no SMTP, no auth races, just one fetch.
 * - When `MAIL_DRIVER=log` (or no driver configured at all) we render to the
 *   logger and return success. Useful when running the API standalone with
 *   no infra wired up yet (e.g. during a smoke test).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private smtp: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  // ---- High-level helpers ----

  async sendVerifyEmail(opts: { to: string; name?: string | null; verifyUrl: string }) {
    const { html, text } = renderVerifyEmailEmail(opts);
    await this.send({
      to: opts.to,
      subject: 'Verify your Outflow email',
      html,
      text,
      category: 'verify_email',
    });
  }

  async sendResetPasswordEmail(opts: { to: string; name?: string | null; resetUrl: string }) {
    const { html, text } = renderResetPasswordEmail(opts);
    await this.send({
      to: opts.to,
      subject: 'Reset your Outflow password',
      html,
      text,
      category: 'reset_password',
    });
  }

  // ---- Driver ----

  async send(args: SendArgs): Promise<void> {
    const driver = (this.config.get<string>('MAIL_DRIVER') ?? 'log').toLowerCase();
    const from = this.config.get<string>('MAIL_FROM') ?? 'Outflow <noreply@localhost>';

    if (driver === 'log') {
      this.logger.log(
        `[mail:${args.category}] to=${args.to} subject="${args.subject}" (driver=log, would send)`,
      );
      this.logger.debug(`[mail:${args.category}] body:\n${args.text}`);
      return;
    }

    if (driver === 'resend') {
      await this.sendViaResend(from, args);
      return;
    }

    // Default: SMTP (Mailhog or any other server)
    await this.sendViaSmtp(from, args);
  }

  private async sendViaSmtp(from: string, args: SendArgs): Promise<void> {
    if (!this.smtp) {
      this.smtp = nodemailer.createTransport({
        host: this.config.get<string>('SMTP_HOST') ?? 'localhost',
        port: Number(this.config.get<string>('SMTP_PORT') ?? '1025'),
        secure: this.config.get<string>('SMTP_SECURE') === 'true',
        auth: this.config.get<string>('SMTP_USER')
          ? {
              user: this.config.getOrThrow<string>('SMTP_USER'),
              pass: this.config.getOrThrow<string>('SMTP_PASS'),
            }
          : undefined,
      });
    }

    try {
      await this.smtp.sendMail({
        from,
        to: args.to,
        subject: args.subject,
        text: args.text,
        html: args.html,
        headers: { 'X-Outflow-Category': args.category },
      });
      this.logger.log(`[mail:${args.category}] sent via smtp to=${args.to}`);
    } catch (err) {
      this.logger.error(`[mail:${args.category}] smtp send failed`, err as Error);
      throw err;
    }
  }

  private async sendViaResend(from: string, args: SendArgs): Promise<void> {
    const apiKey = this.config.getOrThrow<string>('RESEND_API_KEY');
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [args.to],
        subject: args.subject,
        html: args.html,
        text: args.text,
        tags: [{ name: 'category', value: args.category }],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`[mail:${args.category}] resend failed status=${res.status} body=${body}`);
      throw new Error(`Resend send failed: ${res.status}`);
    }
    this.logger.log(`[mail:${args.category}] sent via resend to=${args.to}`);
  }
}
