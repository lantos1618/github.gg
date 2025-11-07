/**
 * Dev Environment Command Processor
 * Processes email commands and orchestrates environment lifecycle
 */

import { db } from '@/db';
import { inboundEmailCommands, devEnvironments } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { emailParser, ParsedEmailCommand } from './email-parser';
import { emailService } from './email-service';
import { orchestrator } from './orchestrator';

interface ProcessEmailParams {
  from: string;
  to: string;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  messageId?: string;
  inReplyTo?: string;
  userId?: string;
}

export class CommandProcessor {
  /**
   * Process an inbound email command
   */
  async processEmail(params: ProcessEmailParams): Promise<void> {
    // 1. Store inbound email
    const [emailRecord] = await db
      .insert(inboundEmailCommands)
      .values({
        from: params.from,
        to: params.to,
        subject: params.subject,
        bodyText: params.bodyText,
        bodyHtml: params.bodyHtml,
        messageId: params.messageId,
        inReplyTo: params.inReplyTo,
        userId: params.userId,
        status: 'pending',
      })
      .returning();

    try {
      // 2. Parse command
      const parsedCommand = emailParser.parse({
        subject: params.subject,
        bodyText: params.bodyText,
        bodyHtml: params.bodyHtml,
      });

      // 3. Update email record with parsed command
      await db
        .update(inboundEmailCommands)
        .set({
          command: parsedCommand.command,
          commandData: parsedCommand.data,
          status: 'processing',
          processedAt: new Date(),
        })
        .where(eq(inboundEmailCommands.id, emailRecord.id));

      // 4. Execute command
      await this.executeCommand(
        parsedCommand,
        params.from,
        params.userId || params.from,
        emailRecord.id
      );

      // 5. Mark as completed
      await db
        .update(inboundEmailCommands)
        .set({
          status: 'completed',
          responseSent: true,
        })
        .where(eq(inboundEmailCommands.id, emailRecord.id));
    } catch (error: any) {
      console.error('Error processing email command:', error);

      // Update email record with error
      await db
        .update(inboundEmailCommands)
        .set({
          status: 'failed',
          errorMessage: error.message,
        })
        .where(eq(inboundEmailCommands.id, emailRecord.id));

      // Send error email
      await emailService.send({
        to: params.from,
        subject: 'Error processing your command',
        text: `Failed to process your command: ${error.message}`,
      });
    }
  }

  /**
   * Execute a parsed command
   */
  private async executeCommand(
    command: ParsedEmailCommand,
    userEmail: string,
    userId: string,
    emailRecordId: string
  ): Promise<void> {
    switch (command.command) {
      case 'create':
        await this.handleCreate(command, userEmail, userId, emailRecordId);
        break;

      case 'destroy':
        await this.handleDestroy(command, userEmail, userId);
        break;

      case 'status':
        await this.handleStatus(command, userEmail, userId);
        break;

      case 'list':
        await this.handleList(userEmail, userId);
        break;

      case 'execute':
        await this.handleExecute(command, userEmail, userId);
        break;

      case 'connect':
        await this.handleConnect(command, userEmail, userId);
        break;

      default:
        throw new Error(`Unknown command: ${command.command}`);
    }
  }

  /**
   * Handle CREATE command
   */
  private async handleCreate(
    command: ParsedEmailCommand,
    userEmail: string,
    userId: string,
    emailRecordId: string
  ): Promise<void> {
    try {
      const environment = await orchestrator.createEnvironment({
        userId,
        resources: command.data.resources,
        durationHours: command.data.durationHours || 24,
        repositoryUrl: command.data.repositoryUrl,
        initScript: command.data.initScript,
        environmentVars: command.data.environmentVars,
      });

      // Link environment to email
      await db
        .update(inboundEmailCommands)
        .set({
          environmentId: environment.id,
        })
        .where(eq(inboundEmailCommands.id, emailRecordId));

      // Send success email
      await emailService.sendEnvironmentCreated(userEmail, environment);
    } catch (error: any) {
      await emailService.sendEnvironmentCreationFailed(userEmail, error.message);
      throw error;
    }
  }

  /**
   * Handle DESTROY command
   */
  private async handleDestroy(
    command: ParsedEmailCommand,
    userEmail: string,
    userId: string
  ): Promise<void> {
    const slug =
      command.data.environmentSlug || command.data.environmentId;

    if (!slug) {
      throw new Error('Environment ID or slug is required for destroy command');
    }

    // Find environment
    const [environment] = await db
      .select()
      .from(devEnvironments)
      .where(
        and(
          eq(devEnvironments.userId, userId),
          eq(devEnvironments.slug, slug)
        )
      )
      .limit(1);

    if (!environment) {
      throw new Error(`Environment ${slug} not found`);
    }

    // Destroy environment
    await orchestrator.destroyEnvironment(environment.id, userId);

    // Send confirmation
    await emailService.sendEnvironmentDestroyed(userEmail, slug);
  }

  /**
   * Handle STATUS command
   */
  private async handleStatus(
    command: ParsedEmailCommand,
    userEmail: string,
    userId: string
  ): Promise<void> {
    const slug =
      command.data.environmentSlug || command.data.environmentId;

    if (!slug) {
      throw new Error('Environment ID or slug is required for status command');
    }

    // Find environment
    const [environment] = await db
      .select()
      .from(devEnvironments)
      .where(
        and(
          eq(devEnvironments.userId, userId),
          eq(devEnvironments.slug, slug)
        )
      )
      .limit(1);

    if (!environment) {
      throw new Error(`Environment ${slug} not found`);
    }

    const details = await orchestrator.getEnvironment(environment.id);
    if (!details) {
      throw new Error(`Environment ${slug} not found`);
    }

    await emailService.sendEnvironmentStatus(userEmail, details);
  }

  /**
   * Handle LIST command
   */
  private async handleList(userEmail: string, userId: string): Promise<void> {
    const environments = await orchestrator.listEnvironments(userId);
    await emailService.sendEnvironmentList(userEmail, environments);
  }

  /**
   * Handle EXECUTE command
   */
  private async handleExecute(
    command: ParsedEmailCommand,
    userEmail: string,
    userId: string
  ): Promise<void> {
    const slug =
      command.data.environmentSlug || command.data.environmentId;

    if (!slug) {
      throw new Error('Environment ID or slug is required for execute command');
    }

    if (!command.data.code) {
      throw new Error('No code provided to execute');
    }

    // Find environment
    const [environment] = await db
      .select()
      .from(devEnvironments)
      .where(
        and(
          eq(devEnvironments.userId, userId),
          eq(devEnvironments.slug, slug)
        )
      )
      .limit(1);

    if (!environment) {
      throw new Error(`Environment ${slug} not found`);
    }

    // TODO: Execute code in environment via control plane agent
    // For now, send acknowledgment
    await emailService.send({
      to: userEmail,
      subject: `Execution queued for ${slug}`,
      text: `Your code has been queued for execution in ${slug}:\n\n${command.data.code}`,
    });
  }

  /**
   * Handle CONNECT command
   */
  private async handleConnect(
    command: ParsedEmailCommand,
    userEmail: string,
    userId: string
  ): Promise<void> {
    const slug =
      command.data.environmentSlug || command.data.environmentId;

    if (!slug) {
      throw new Error('Environment ID or slug is required for connect command');
    }

    // Find environment
    const [environment] = await db
      .select()
      .from(devEnvironments)
      .where(
        and(
          eq(devEnvironments.userId, userId),
          eq(devEnvironments.slug, slug)
        )
      )
      .limit(1);

    if (!environment) {
      throw new Error(`Environment ${slug} not found`);
    }

    const details = await orchestrator.getEnvironment(environment.id);
    if (!details) {
      throw new Error(`Environment ${slug} not found`);
    }

    // Send connection details
    await emailService.sendEnvironmentCreated(userEmail, details);
  }
}

export const commandProcessor = new CommandProcessor();
