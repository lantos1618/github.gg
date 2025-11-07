/**
 * Email Service for Dev Environments
 * Uses Resend for all application emails (same as github.gg platform)
 */

import { Resend } from 'resend';
import { EnvironmentDetails } from './orchestrator';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
  replyTo?: string;
}

export class EmailService {
  private fromEmail: string;

  constructor() {
    this.fromEmail = process.env.DEV_ENV_FROM_EMAIL || 'devenv@github.gg';

    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured');
    }
  }

  /**
   * Send a generic email via Resend
   */
  async send(params: SendEmailParams): Promise<void> {
    if (!process.env.RESEND_API_KEY) {
      console.log('Email would be sent (Resend not configured):', params);
      return;
    }

    try {
      await resend.emails.send({
        from: params.from || this.fromEmail,
        to: params.to,
        subject: params.subject,
        html: params.html || params.text,
        text: params.text,
        replyTo: params.replyTo,
      });
    } catch (error) {
      console.error('Failed to send email via Resend:', error);
      throw error;
    }
  }

  /**
   * Send environment creation success email
   */
  async sendEnvironmentCreated(
    to: string,
    environment: EnvironmentDetails
  ): Promise<void> {
    const expiresAt = new Date(environment.expiresAt).toLocaleString('en-US', {
      timeZone: 'UTC',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const text = `
Your development environment is ready!

Environment ID: ${environment.slug}
Status: ${environment.state}

${
  environment.sshPort
    ? `SSH Access: ssh root@${environment.ipAddress} -p ${environment.sshPort}`
    : 'SSH access will be available shortly...'
}

${
  environment.vscodePort
    ? `VS Code: https://${environment.slug}.github.gg`
    : 'VS Code access will be available shortly...'
}

${environment.wsEndpoint ? `WebSocket: ${environment.wsEndpoint}` : ''}

Expires: ${expiresAt} UTC

To destroy this environment, reply to this email with:
Subject: Destroy ${environment.slug}
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: #f7fafc; padding: 30px; border-radius: 0 0 8px 8px; }
    .env-id { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
    .info-box { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #667eea; }
    .code { background: #2d3748; color: #e2e8f0; padding: 12px; border-radius: 4px; font-family: 'Monaco', 'Courier New', monospace; font-size: 13px; overflow-x: auto; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">🚀 Environment Ready!</h1>
  </div>
  <div class="content">
    <div class="env-id">${environment.slug}</div>
    <p>Your development environment has been provisioned and is ready to use.</p>

    ${
      environment.sshPort
        ? `
    <div class="info-box">
      <h3 style="margin-top: 0;">SSH Access</h3>
      <div class="code">ssh root@${environment.ipAddress} -p ${environment.sshPort}</div>
    </div>
    `
        : '<p><em>SSH access is being configured...</em></p>'
    }

    ${
      environment.vscodePort
        ? `
    <div class="info-box">
      <h3 style="margin-top: 0;">VS Code Browser Access</h3>
      <div class="code">https://${environment.slug}.github.gg</div>
    </div>
    `
        : ''
    }

    <div class="info-box">
      <h3 style="margin-top: 0;">Details</h3>
      <ul>
        <li><strong>Status:</strong> ${environment.state}</li>
        <li><strong>Expires:</strong> ${expiresAt} UTC</li>
      </ul>
    </div>

    <div class="footer">
      <p>To destroy this environment, reply with subject: <code>Destroy ${environment.slug}</code></p>
    </div>
  </div>
</body>
</html>
    `.trim();

    await this.send({
      to,
      subject: `✓ Environment ${environment.slug} is ready`,
      text,
      html,
    });
  }

  /**
   * Send environment creation failed email
   */
  async sendEnvironmentCreationFailed(
    to: string,
    error: string
  ): Promise<void> {
    const text = `
Failed to create your development environment.

Error: ${error}

Please try again or contact support if the issue persists.
    `.trim();

    await this.send({
      to,
      subject: '✗ Failed to create environment',
      text,
    });
  }

  /**
   * Send environment status email
   */
  async sendEnvironmentStatus(
    to: string,
    environment: EnvironmentDetails
  ): Promise<void> {
    const text = `
Environment: ${environment.slug}
Status: ${environment.state}
Created: ${environment.createdAt.toLocaleString()}
Expires: ${environment.expiresAt.toLocaleString()}

${environment.ipAddress ? `IP: ${environment.ipAddress}` : ''}
${environment.sshPort ? `SSH Port: ${environment.sshPort}` : ''}
    `.trim();

    await this.send({
      to,
      subject: `Status: ${environment.slug}`,
      text,
    });
  }

  /**
   * Send environment destroyed email
   */
  async sendEnvironmentDestroyed(to: string, slug: string): Promise<void> {
    const text = `
Environment ${slug} has been destroyed.

All data has been deleted and resources have been freed.
    `.trim();

    await this.send({
      to,
      subject: `Environment ${slug} destroyed`,
      text,
    });
  }

  /**
   * Send command execution result
   */
  async sendExecutionResult(
    to: string,
    environmentSlug: string,
    result: {
      exitCode: number;
      stdout: string;
      stderr: string;
    }
  ): Promise<void> {
    const text = `
Execution complete in ${environmentSlug}

Exit Code: ${result.exitCode}

--- Output ---
${result.stdout}

${
  result.stderr
    ? `--- Errors ---
${result.stderr}`
    : ''
}
    `.trim();

    await this.send({
      to,
      subject: `Execution ${result.exitCode === 0 ? 'succeeded' : 'failed'} in ${environmentSlug}`,
      text,
    });
  }

  /**
   * Send list of environments
   */
  async sendEnvironmentList(
    to: string,
    environments: EnvironmentDetails[]
  ): Promise<void> {
    if (environments.length === 0) {
      await this.send({
        to,
        subject: 'Your environments',
        text: 'You have no active development environments.',
      });
      return;
    }

    const text = `
You have ${environments.length} active environment(s):

${environments
  .map(
    (env) => `
${env.slug}
  Status: ${env.state}
  Created: ${env.createdAt.toLocaleString()}
  Expires: ${env.expiresAt.toLocaleString()}
  ${env.ipAddress ? `IP: ${env.ipAddress}` : ''}
`
  )
  .join('\n')}
    `.trim();

    await this.send({
      to,
      subject: 'Your environments',
      text,
    });
  }
}

export const emailService = new EmailService();
