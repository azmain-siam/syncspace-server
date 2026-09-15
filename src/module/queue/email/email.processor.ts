import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailService } from 'src/module/email/services/email.service';
import {
  EMAIL_JOBS,
  EMAIL_QUEUE,
  SendForgotPasswordEmailPayload,
  SendVerificationEmailPayload,
  SendWelcomeEmailPayload,
  SendWorkspaceInvitationPayload,
} from './email.queue';

@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<void> {
    const startTime = Date.now();
    const payload = job.data as { to?: string };
    const recipient = payload?.to || 'unknown';

    this.logger.log(
      `[Job Started] ID: ${job.id}, Type: ${job.name}, Recipient: ${recipient}`,
    );

    try {
      switch (job.name) {
        case EMAIL_JOBS.SEND_VERIFICATION_EMAIL: {
          const payload = job.data as SendVerificationEmailPayload;
          await this.emailService.sendVerificationEmail(
            payload.to,
            payload.name,
            payload.verificationUrl,
          );
          break;
        }

        case EMAIL_JOBS.SEND_PASSWORD_RESET_EMAIL: {
          const payload = job.data as SendForgotPasswordEmailPayload;
          await this.emailService.sendForgotPasswordEmail(
            payload.to,
            payload.name,
            payload.resetUrl,
          );
          break;
        }

        case EMAIL_JOBS.SEND_WORKSPACE_INVITATION: {
          const payload = job.data as SendWorkspaceInvitationPayload;
          await this.emailService.sendWorkspaceInvitation(
            payload.to,
            payload.inviterName,
            payload.workspaceName,
            payload.invitationUrl,
          );
          break;
        }

        case EMAIL_JOBS.SEND_WELCOME_EMAIL: {
          const payload = job.data as SendWelcomeEmailPayload;
          await this.emailService.sendWelcomeEmail(
            payload.to,
            payload.name,
            payload.dashboardUrl,
          );
          break;
        }

        default:
          this.logger.warn(`Unknown job type received: ${job.name}`);
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `[Job Completed] ID: ${job.id}, Type: ${job.name}, Duration: ${duration}ms`,
      );
    } catch (error: unknown) {
      const errStack = error instanceof Error ? error.stack : String(error);
      const attempts = job.attemptsMade + 1;
      const maxAttempts = job.opts.attempts || 3;

      this.logger.error(
        `[Job Failed] ID: ${job.id}, Type: ${job.name}, Attempt: ${attempts}/${maxAttempts}`,
        errStack,
      );

      throw error; // Re-throw to allow BullMQ to handle retry attempts
    }
  }
}
