import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EMAIL_TEMPLATES } from '../constants/email.constants';
import { SendEmailOptions } from '../interfaces/email-options.interface';
import { TemplateService } from './template.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly defaultFrom: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly templateService: TemplateService,
  ) {
    const host = this.configService.get<string>('email.host', 'smtp.gmail.com');
    const port = this.configService.get<number>('email.port', 587);
    const secure = this.configService.get<boolean>('email.secure', false);
    const user = this.configService.get<string>('email.user');
    const pass = this.configService.get<string>('email.pass');
    this.defaultFrom = this.configService.get<string>(
      'email.from',
      'SyncSpace <noreply@syncspace.com>',
    );

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  // Generic Email Sender
  async sendEmail(options: SendEmailOptions): Promise<void> {
    const recipients = Array.isArray(options.to)
      ? options.to.join(', ')
      : options.to;

    try {
      this.logger.log(
        `Sending email [Template: ${options.template}] to: ${recipients}`,
      );

      const html = this.templateService.compile(
        options.template,
        options.context,
      );

      await this.transporter.sendMail({
        from: this.defaultFrom,
        to: options.to,
        subject: options.subject,
        html,
        attachments: options.attachments,
      });

      this.logger.log(
        `Email successfully sent [Template: ${options.template}] to: ${recipients}`,
      );
    } catch (error: unknown) {
      const errStack = error instanceof Error ? error.stack : String(error);
      this.logger.error(
        `Failed to send email [Template: ${options.template}] to: ${recipients}`,
        errStack,
      );

      throw new InternalServerErrorException(
        'Failed to send email notification. Please try again later.',
      );
    }
  }

  // Send Email Verification
  async sendVerificationEmail(
    to: string,
    name: string,
    verificationUrl: string,
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Verify Your Email Address - SyncSpace',
      template: EMAIL_TEMPLATES.VERIFY_EMAIL,
      context: {
        name,
        verificationUrl,
      },
    });
  }

  // Send Workspace Invitation
  async sendWorkspaceInvitation(
    to: string,
    inviterName: string,
    workspaceName: string,
    invitationUrl: string,
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject: `Invitation to join workspace "${workspaceName}" - SyncSpace`,
      template: EMAIL_TEMPLATES.WORKSPACE_INVITATION,
      context: {
        inviterName,
        workspaceName,
        invitationUrl,
      },
    });
  }

  // Send Forgot Password Email
  async sendForgotPasswordEmail(
    to: string,
    name: string,
    resetUrl: string,
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Reset Your Password - SyncSpace',
      template: EMAIL_TEMPLATES.FORGOT_PASSWORD,
      context: {
        name,
        resetUrl,
      },
    });
  }

  // Send Welcome Email
  async sendWelcomeEmail(
    to: string,
    name: string,
    dashboardUrl: string,
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Welcome to SyncSpace!',
      template: EMAIL_TEMPLATES.WELCOME,
      context: {
        name,
        dashboardUrl,
      },
    });
  }
}
