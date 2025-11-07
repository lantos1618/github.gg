/**
 * Email Command Parser
 * Parses emails sent to agent@github.gg and extracts dev environment commands
 */

export type EmailCommand =
  | 'create'
  | 'destroy'
  | 'status'
  | 'connect'
  | 'execute'
  | 'list';

export interface ParsedEmailCommand {
  command: EmailCommand;
  data: {
    // For create
    resources?: {
      vcpus?: number;
      memoryMb?: number;
      diskGb?: number;
    };
    durationHours?: number;
    repositoryUrl?: string;
    initScript?: string;
    environmentVars?: Record<string, string>;

    // For destroy/status/connect
    environmentId?: string;
    environmentSlug?: string;

    // For execute
    code?: string;
    workingDir?: string;
  };
}

export class EmailCommandParser {
  /**
   * Parse an email and extract the command
   */
  parse(email: {
    subject: string;
    bodyText?: string;
    bodyHtml?: string;
  }): ParsedEmailCommand {
    const subject = email.subject.toLowerCase().trim();
    const body = email.bodyText || this.stripHtml(email.bodyHtml || '');

    // Try to parse as JSON first
    const jsonCommand = this.tryParseJson(body);
    if (jsonCommand) {
      return jsonCommand;
    }

    // Parse from subject line
    const command = this.extractCommand(subject);
    const data = this.extractData(subject, body, command);

    return {
      command,
      data,
    };
  }

  /**
   * Try to parse body as JSON command
   */
  private tryParseJson(body: string): ParsedEmailCommand | null {
    try {
      const trimmed = body.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);

        if (!parsed.action) {
          return null;
        }

        return {
          command: parsed.action as EmailCommand,
          data: {
            resources: parsed.resources,
            durationHours: this.parseDuration(parsed.duration),
            repositoryUrl: parsed.repository || parsed.repositoryUrl,
            initScript: parsed.initScript,
            environmentVars: parsed.env || parsed.environmentVars,
            environmentId: parsed.envId || parsed.environmentId,
            environmentSlug: parsed.slug,
            code: parsed.code,
            workingDir: parsed.workingDir || '/workspace',
          },
        };
      }
    } catch (error) {
      // Not valid JSON, continue with text parsing
    }
    return null;
  }

  /**
   * Extract command from subject or body
   */
  private extractCommand(subject: string): EmailCommand {
    // Check for command keywords
    if (
      subject.includes('create') ||
      subject.includes('new') ||
      subject.includes('spin up') ||
      subject.includes('start')
    ) {
      return 'create';
    }

    if (
      subject.includes('destroy') ||
      subject.includes('delete') ||
      subject.includes('remove') ||
      subject.includes('kill')
    ) {
      return 'destroy';
    }

    if (subject.includes('status') || subject.includes('info')) {
      return 'status';
    }

    if (
      subject.includes('connect') ||
      subject.includes('access') ||
      subject.includes('ssh')
    ) {
      return 'connect';
    }

    if (
      subject.includes('execute') ||
      subject.includes('run') ||
      subject.includes('exec')
    ) {
      return 'execute';
    }

    if (subject.includes('list') || subject.includes('show')) {
      return 'list';
    }

    // Default to create
    return 'create';
  }

  /**
   * Extract data from email content
   */
  private extractData(
    subject: string,
    body: string,
    command: EmailCommand
  ): ParsedEmailCommand['data'] {
    const data: ParsedEmailCommand['data'] = {};

    const fullText = `${subject} ${body}`.toLowerCase();

    // Extract environment ID/slug
    const envMatch = fullText.match(/env[_-]([a-z0-9]{8,})/i);
    if (envMatch) {
      data.environmentSlug = envMatch[0];
    }

    // Extract repository URL
    const repoMatch = fullText.match(
      /(https?:\/\/github\.com\/[\w-]+\/[\w-]+)/i
    );
    if (repoMatch) {
      data.repositoryUrl = repoMatch[1];
    }

    // Extract resources
    const cpuMatch = fullText.match(/(\d+)\s*(cpu|vcpu|core)/i);
    if (cpuMatch) {
      data.resources = data.resources || {};
      data.resources.vcpus = parseInt(cpuMatch[1]);
    }

    const memoryMatch = fullText.match(/(\d+)\s*(gb|mb)\s*(ram|memory)/i);
    if (memoryMatch) {
      data.resources = data.resources || {};
      const amount = parseInt(memoryMatch[1]);
      const unit = memoryMatch[2].toLowerCase();
      data.resources.memoryMb = unit === 'gb' ? amount * 1024 : amount;
    }

    const diskMatch = fullText.match(/(\d+)\s*gb\s*disk/i);
    if (diskMatch) {
      data.resources = data.resources || {};
      data.resources.diskGb = parseInt(diskMatch[1]);
    }

    // Extract duration
    const durationMatch = fullText.match(/(\d+)\s*(hour|hr|h|day|d)/i);
    if (durationMatch) {
      const amount = parseInt(durationMatch[1]);
      const unit = durationMatch[2].toLowerCase();
      if (unit.startsWith('d')) {
        data.durationHours = amount * 24;
      } else {
        data.durationHours = amount;
      }
    }

    // Extract code blocks for execute command
    if (command === 'execute') {
      const codeBlockMatch = body.match(/```([^`]+)```/s);
      if (codeBlockMatch) {
        data.code = codeBlockMatch[1].trim();
      } else {
        // Use entire body as code if no code block
        data.code = body.trim();
      }
    }

    return data;
  }

  /**
   * Parse duration string like "2h", "24h", "7d"
   */
  private parseDuration(duration?: string): number | undefined {
    if (!duration) return undefined;

    const match = duration.match(/(\d+)(h|d)/i);
    if (!match) return undefined;

    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    if (unit === 'd') {
      return amount * 24;
    }
    return amount;
  }

  /**
   * Strip HTML tags from string
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }
}

export const emailParser = new EmailCommandParser();
