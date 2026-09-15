import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  EMAIL_JOBS,
  EMAIL_QUEUE,
  SendForgotPasswordEmailPayload,
  SendVerificationEmailPayload,
  SendWelcomeEmailPayload,
  SendWorkspaceInvitationPayload,
} from './email.queue';

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);

  private readonly defaultJobOpts = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 3600,
      count: 1000,
    },
    removeOnFail: false,
  };

  constructor(
    @InjectQueue(EMAIL_QUEUE)
    private readonly emailQueue: Queue,
  ) {}

  // Enqueue Verification Email Job
  async sendVerificationEmail(payload: SendVerificationEmailPayload) {
    const job = await this.emailQueue.add(
      EMAIL_JOBS.SEND_VERIFICATION_EMAIL,
      payload,
      this.defaultJobOpts,
    );
    this.logger.log(
      `[Job Enqueued] ID: ${job.id}, Type: ${EMAIL_JOBS.SEND_VERIFICATION_EMAIL}, Recipient: ${payload.to}`,
    );
    return job;
  }

  // Enqueue Forgot Password Email Job
  async sendForgotPasswordEmail(payload: SendForgotPasswordEmailPayload) {
    const job = await this.emailQueue.add(
      EMAIL_JOBS.SEND_PASSWORD_RESET_EMAIL,
      payload,
      this.defaultJobOpts,
    );
    this.logger.log(
      `[Job Enqueued] ID: ${job.id}, Type: ${EMAIL_JOBS.SEND_PASSWORD_RESET_EMAIL}, Recipient: ${payload.to}`,
    );
    return job;
  }

  // Enqueue Workspace Invitation Email Job
  async sendWorkspaceInvitation(payload: SendWorkspaceInvitationPayload) {
    const job = await this.emailQueue.add(
      EMAIL_JOBS.SEND_WORKSPACE_INVITATION,
      payload,
      this.defaultJobOpts,
    );
    this.logger.log(
      `[Job Enqueued] ID: ${job.id}, Type: ${EMAIL_JOBS.SEND_WORKSPACE_INVITATION}, Recipient: ${payload.to}`,
    );
    return job;
  }

  // Enqueue Welcome Email Job
  async sendWelcomeEmail(payload: SendWelcomeEmailPayload) {
    const job = await this.emailQueue.add(
      EMAIL_JOBS.SEND_WELCOME_EMAIL,
      payload,
      this.defaultJobOpts,
    );
    this.logger.log(
      `[Job Enqueued] ID: ${job.id}, Type: ${EMAIL_JOBS.SEND_WELCOME_EMAIL}, Recipient: ${payload.to}`,
    );
    return job;
  }
}
