export const EMAIL_TEMPLATES = {
  VERIFY_EMAIL: 'verify-email',
  WORKSPACE_INVITATION: 'workspace-invitation',
  FORGOT_PASSWORD: 'forgot-password',
  WELCOME: 'welcome',
} as const;

export type EmailTemplate =
  (typeof EMAIL_TEMPLATES)[keyof typeof EMAIL_TEMPLATES];
