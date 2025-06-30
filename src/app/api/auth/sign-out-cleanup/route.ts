import { auth } from '@/lib/auth';
import { db } from '@/db';
import { account } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

/**
 * This endpoint handles application-specific cleanup tasks during sign-out.
 * It's called by the client just before the main `better-auth` sign-out action.
 */
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession(request);
    
    // If the user has a session, clear the linked installation ID from their account.
    if (session?.user?.id) {
      await db.update(account)
        .set({ 
          installationId: null,
          updatedAt: new Date()
        })
        .where(and(
          eq(account.userId, session.user.id),
          eq(account.providerId, 'github')
        ));
      console.log(`[sign-out-cleanup] Cleared installation ID for user: ${session.user.id}`);
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[sign-out-cleanup] Error during cleanup:', error);
    return NextResponse.json({ success: false, error: 'Failed to clean up session' }, { status: 500 });
  }
} 