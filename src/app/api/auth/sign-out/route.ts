import { NextResponse } from 'next/server';
import { GitHubAppSessionManager } from '@/lib/auth';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { account } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    console.log('[sign-out] Starting sign out process...');
    
    // Get the current session to find the user
    const session = await auth.api.getSession(request);
    
    // Clear GitHub App session first
    await GitHubAppSessionManager.clearSession();
    console.log('[sign-out] Cleared GitHub App session');
    
    // If user is signed in, clear their installation ID
    if (session?.user?.id) {
      try {
        await db.update(account)
          .set({ 
            installationId: null,
            updatedAt: new Date()
          })
          .where(and(
            eq(account.userId, session.user.id),
            eq(account.providerId, 'github')
          ));
        
        console.log(`[sign-out] Cleared installation ID for user: ${session.user.id}`);
      } catch (dbError) {
        console.warn('[sign-out] Failed to clear installation ID from database:', dbError);
        // Don't fail the sign-out if database update fails
      }
    }
    
    console.log('[sign-out] Sign out completed successfully');
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[sign-out] Error during sign out:', error);
    return NextResponse.json({ success: false, error: 'Failed to sign out' }, { status: 500 });
  }
} 