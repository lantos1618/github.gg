/**
 * SendGrid Inbound Parse Webhook
 * Receives emails sent to agent@lambda.run
 */

import { NextRequest, NextResponse } from 'next/server';
import { commandProcessor } from '@/lib/dev-env/command-processor';
import { db } from '@/db';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Parse form data from SendGrid
    const formData = await request.formData();

    const from = formData.get('from') as string;
    const to = formData.get('to') as string;
    const subject = formData.get('subject') as string;
    const text = formData.get('text') as string;
    const html = formData.get('html') as string;
    const envelope = formData.get('envelope') as string;

    console.log('Received inbound email:', {
      from,
      to,
      subject,
    });

    // Parse envelope to get actual sender
    let actualFrom = from;
    try {
      const envelopeData = JSON.parse(envelope);
      actualFrom = envelopeData.from || from;
    } catch (e) {
      // Use from header if envelope parsing fails
    }

    // Find or create user by email
    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, actualFrom))
      .limit(1);

    const userId = existingUser?.id || actualFrom;

    // Process the email command
    await commandProcessor.processEmail({
      from: actualFrom,
      to,
      subject: subject || '',
      bodyText: text,
      bodyHtml: html,
      messageId: formData.get('message-id') as string | undefined,
      userId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing inbound email:', error);

    // Return 200 to prevent SendGrid retries for application errors
    // We already handle error notifications internally
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 200 }
    );
  }
}

// Also support GET for testing
export async function GET() {
  return NextResponse.json({
    service: 'SendGrid Inbound Parse Webhook',
    endpoint: 'POST /api/webhooks/sendgrid-inbound',
    status: 'active',
  });
}
