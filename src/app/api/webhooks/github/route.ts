import { Webhooks } from '@octokit/webhooks';
import { env } from '@/lib/env';
import { db } from '@/db';
import { githubAppInstallations, installationRepositories } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const webhooks = new Webhooks({
  secret: env.GITHUB_WEBHOOK_SECRET,
});

// Event Handlers
webhooks.on('installation.created', async ({ payload }) => {
  console.log('New installation created:', payload.installation.id);
  
  try {
    // Check if account exists and get its type
    const account = payload.installation.account;
    if (!account) {
      console.error('No account found in installation payload');
      return;
    }

    const accountType = 'type' in account ? account.type : 'User';
    
    // Extract account details based on type
    const accountLogin = 'login' in account ? account.login : account.slug;
    const accountAvatarUrl = account.avatar_url;
    const accountName = 'name' in account ? account.name : accountLogin;
    
    await db.insert(githubAppInstallations).values({
      installationId: payload.installation.id,
      accountId: account.id,
      accountType,
      accountLogin,
      accountAvatarUrl,
      accountName,
      repositorySelection: payload.installation.repository_selection,
    } as any);

    if (payload.repositories) {
      for (const repo of payload.repositories) {
        await db.insert(installationRepositories).values({
          installationId: payload.installation.id,
          repositoryId: repo.id,
          fullName: repo.full_name,
        } as any);
      }
    }
    
    console.log(`Successfully recorded installation ${payload.installation.id}`);
  } catch (error) {
    console.error('Failed to record installation:', error);
  }
});

webhooks.on('installation.deleted', async ({ payload }) => {
  console.log('Installation deleted:', payload.installation.id);
  
  try {
    // First, delete all related repository records
    await db.delete(installationRepositories)
      .where(eq(installationRepositories.installationId, payload.installation.id));
    console.log(`Deleted repository records for installation ${payload.installation.id}`);
    
    // Then delete the installation record
    await db.delete(githubAppInstallations)
      .where(eq(githubAppInstallations.installationId, payload.installation.id));
    console.log(`Successfully deleted installation ${payload.installation.id}`);
  } catch (error) {
    console.error('Failed to delete installation:', error);
  }
});

webhooks.on('installation_repositories.added', async ({ payload }) => {
  console.log(`Repositories added to installation ${payload.installation.id}`);
  
  try {
    for (const repo of payload.repositories_added) {
      await db.insert(installationRepositories).values({
        installationId: payload.installation.id,
        repositoryId: repo.id,
        fullName: repo.full_name,
      } as any);
    }
    console.log(`Successfully added ${payload.repositories_added.length} repositories`);
  } catch (error) {
    console.error('Failed to add repositories:', error);
  }
});

webhooks.on('installation_repositories.removed', async ({ payload }) => {
  console.log(`Repositories removed from installation ${payload.installation.id}`);
  
  try {
    for (const repo of payload.repositories_removed) {
      await db.delete(installationRepositories)
        .where(and(
          eq(installationRepositories.installationId, payload.installation.id),
          eq(installationRepositories.repositoryId, repo.id)
        ));
    }
    console.log(`Successfully removed ${payload.repositories_removed.length} repositories`);
  } catch (error) {
    console.error('Failed to remove repositories:', error);
  }
});

webhooks.on('push', async ({ payload }) => {
  console.log(`Push event for ${payload.repository.full_name}`);
  // TODO: Trigger background job for analysis
  // This will be implemented when we add background job processing
});

webhooks.on('pull_request.opened', async ({ payload }) => {
  console.log(`PR opened: ${payload.pull_request.title} in ${payload.repository.full_name}`);
  // TODO: Trigger analysis and post results as PR comment
});

webhooks.on('pull_request.synchronize', async ({ payload }) => {
  console.log(`PR updated: ${payload.pull_request.title} in ${payload.repository.full_name}`);
  // TODO: Re-run analysis and update existing comment
});

// The main handler
export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get('x-hub-signature-256');

  if (!signature) {
    console.error('No signature found in webhook request');
    return new Response('No signature found', { status: 401 });
  }

  try {
    const verified = await webhooks.verify(payload, signature);
    if (!verified) {
      console.error('Webhook signature verification failed');
      return new Response('Signature verification failed', { status: 401 });
    }
  } catch (error) {
    console.error('Webhook verification error:', error);
    return new Response('Signature verification failed', { status: 401 });
  }

  const event = request.headers.get('x-github-event') ?? 'unknown';
  const delivery = request.headers.get('x-github-delivery') ?? 'unknown';

  try {
    await webhooks.receive({
      id: delivery,
      name: event as any,
      payload: JSON.parse(payload),
    });

    console.log(`Successfully processed webhook event: ${event}`);
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response('Internal server error', { status: 500 });
  }
} 