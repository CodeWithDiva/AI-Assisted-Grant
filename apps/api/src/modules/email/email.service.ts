import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env';

export interface EmailMessage {
  to: string[];
  subject: string;
  text: string;
}

/**
 * Development prints emails to the API console; production posts them to Resend.
 * Sending never throws — a failed reminder must not break the job that triggered it.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly driver: 'console' | 'resend';
  private readonly apiKey?: string;
  private readonly from: string;

  constructor(config: ConfigService<Env, true>) {
    this.driver = config.get('EMAIL_DRIVER', { infer: true });
    this.apiKey = config.get('RESEND_API_KEY', { infer: true });
    this.from = config.get('EMAIL_FROM', { infer: true });
  }

  async send(message: EmailMessage): Promise<boolean> {
    if (!message.to.length) return false;

    if (this.driver === 'console' || !this.apiKey) {
      this.logger.log(
        `EMAIL to ${message.to.join(', ')}\nSubject: ${message.subject}\n${message.text}`,
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
}
