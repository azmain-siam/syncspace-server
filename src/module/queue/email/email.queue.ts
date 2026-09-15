export const EMAIL_QUEUE = 'email-queue';

export const EMAIL_JOBS = {
  SEND_VERIFICATION_EMAIL: 'send-verification-email',
  SEND_PASSWORD_RESET_EMAIL: 'send-password-reset-email',
  SEND_WORKSPACE_INVITATION: 'send-workspace-invitation',
  SEND_WELCOME_EMAIL: 'send-welcome-email',
} as const;

export interface SendVerificationEmailPayload {
  to: string;
  name: string;
  verificationUrl: string;
}

export interface SendForgotPasswordEmailPayload {
  to: string;
  name: string;
  resetUrl: string;
}

export interface SendWorkspaceInvitationPayload {
  to: string;
  inviterName: string;
  workspaceName: string;
  invitationUrl: string;
}

export interface SendWelcomeEmailPayload {
  to: string;
  name: string;
  dashboardUrl: string;
}
