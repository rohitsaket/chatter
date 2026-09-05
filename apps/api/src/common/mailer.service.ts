import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import nodemailer, { type Transporter } from "nodemailer";
import { isProd, loadEnv } from "@chatter/config";
import { createLogger } from "@chatter/logger";

const logger = createLogger("mailer");

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

/**
 * Outbound email.
 *
 * - SMTP_URL set  -> real SMTP delivery.
 * - otherwise, non-production -> writes an .eml file to MAIL_DEV_OUTBOX. This is
 *   a local mail sink (the same idea as MailHog), not a log: the message is
 *   *delivered* there, which is why an OTP may appear in it.
 * - otherwise, production -> throws. Silently dropping a password-reset mail
 *   would strand users, so the failure is made loud instead.
 *
 * Message bodies are never written to the application log.
 */
@Injectable()
export class MailerService {
  private transport?: Transporter;

  private smtp(): Transporter | null {
    const url = loadEnv().SMTP_URL;
    if (!url) return null;
    if (!this.transport) this.transport = nodemailer.createTransport(url);
    return this.transport;
  }

  async send(mail: Mail): Promise<void> {
    const env = loadEnv();
    const transport = this.smtp();

    if (transport) {
      await transport.sendMail({ from: env.MAIL_FROM, to: mail.to, subject: mail.subject, text: mail.text });
      // Subject and recipient only — never the body.
      logger.info({ to: maskEmail(mail.to), subject: mail.subject }, "mail sent");
      return;
    }

    if (isProd()) {
      throw new Error("SMTP_URL is not configured; refusing to send mail in production");
    }

    const dir = resolve(env.MAIL_DEV_OUTBOX);
    await mkdir(dir, { recursive: true });
    const file = join(dir, `${Date.now()}-${randomUUID()}.eml`);
    const eml = [
      `From: ${env.MAIL_FROM}`,
      `To: ${mail.to}`,
      `Subject: ${mail.subject}`,
      `Date: ${new Date().toUTCString()}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      mail.text,
      "",
    ].join("\r\n");
    await writeFile(file, eml, "utf8");
    logger.info({ to: maskEmail(mail.to), subject: mail.subject, outbox: dir }, "mail written to dev outbox");
  }
}

/** "john.doe@acme.com" -> "j***@acme.com" */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  return `${email[0]}***${email.slice(at)}`;
}
