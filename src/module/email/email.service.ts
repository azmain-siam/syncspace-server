import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
  constructor(private mailer: MailerService) {}

  async sendMail(to: string, subject: string, html: string) {
    await this.mailer.sendMail({
      to,
      subject,
      html,
    });
  }
}
