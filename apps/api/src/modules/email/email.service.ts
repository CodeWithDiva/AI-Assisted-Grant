import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Env } from '../../config/env';

export interface EmailMessage {
  to: string[];
  subject: string;
  text: string;
  html?: string;
}

/** Where development writes each email's HTML, so it can be opened in a browser. */
const PREVIEW_DIR = resolve('.email-previews');

/**
 * Development prints emails to the API console (and saves an HTML preview); production
 * posts them to Resend. Sending never throws — a failed email must not break the action
 * that triggered it.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly driver: 'console' | 'resend';
  private readonly apiKey?: string;
  private readonly from: string;
  private readonly production: boolean;

  constructor(config: ConfigService<Env, true>) {
    this.driver = config.get('EMAIL_DRIVER', { infer: true });
    this.apiKey = config.get('RESEND_API_KEY', { infer: true });
    this.from = config.get('EMAIL_FROM', { infer: true });
    this.production = config.get('NODE_ENV', { infer: true }) === 'production';
  }

  async send(message: EmailMessage): Promise<boolean> {
    if (!message.to.length) return false;

    if (this.driver === 'console' || !this.apiKey) {
      const preview = await this.savePreview(message);
      this.logger.log(
        `EMAIL to ${message.to.join(', ')}\nSubject: ${message.subject}\n${message.text}${
          preview ? `\nHTML preview: ${preview}` : ''
        }`,
      );
      return true;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: message.to,
          subject: message.subject,
          text: message.text,
          ...(message.html ? { html: message.html } : {}),
        }),
      });

      if (!response.ok) {
        this.logger.error(
          `Resend rejected the email (${response.status}): ${await response.text()}`,
        );
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error(`Could not send email: ${(error as Error).message}`);
      return false;
    }
  }

  private async savePreview(message: EmailMessage): Promise<string | null> {
    if (!message.html || this.production) return null;
    try {
      await mkdir(PREVIEW_DIR, { recursive: true });
      const slug = message.subject
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 50);
      const file = join(PREVIEW_DIR, `${new Date().toISOString().replace(/[:.]/g, '-')}-${slug}.html`);
      await writeFile(file, message.html, 'utf8');
      return file;
    } catch {
      return null;
    }
  }
}
