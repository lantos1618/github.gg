import { NextResponse } from 'next/server';
import { GitHubAppSessionManager } from '@/lib/auth';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { account } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    // Get the current session to find the user
    const session = await auth.api.getSession(request);
    
    // Clear GitHub App session
    await GitHubAppSessionManager.clearSession();
    
    // If user is signed in, clear their installation ID
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
      
      console.log(`🧹 Cleared installation ID for user: ${session.user.id}`);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error during sign out:', error);
    return NextResponse.json({ success: false, error: 'Failed to sign out' }, { status: 500 });
  }
} 