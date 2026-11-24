import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

/**
 * Sends emails with Nodemailer.
 *  - If SMTP_HOST is set: uses that real SMTP server.
 *  - Otherwise: creates a free Ethereal test inbox. Nothing is delivered to
 *    a real person; the console prints a URL where you can view the email.
 *  - If even that fails (e.g. offline): prints the email text to the console.
 */
let transporter: Transporter | null = null;

async function getTransporter(): Promise<Transporter> {
  if (transporter) return transporter; // create once, reuse afterwards

  if (env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  } else {
    const account = await nodemailer.createTestAccount(); // free fake inbox
    transporter = nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: { user: account.user, pass: account.pass },
    });
  }
  return transporter;
}

export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  try {
    const info = await (await getTransporter()).sendMail({ from: env.MAIL_FROM, to, subject, text });
    // Only Ethereal returns a preview URL
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) console.log(`Email preview: ${preview}`);
  } catch (err) {
    console.warn('Email could not be sent, printing it instead:');
    console.log(`To: ${to}\nSubject: ${subject}\n${text}`);
  }
}
