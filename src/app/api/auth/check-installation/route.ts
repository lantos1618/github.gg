import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession(request);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the GitHub access token using Better Auth's method
    const { accessToken } = await auth.api.getAccessToken({
      body: {
        providerId: 'github',
        userId: session.user.id,
      },
      headers: request.headers,
    });
    
    if (!accessToken) {
      return NextResponse.json({ error: 'No GitHub access token found' }, { status: 404 });
    }

    console.log('🔍 Checking GitHub App installation for user:', session.user.id);

    const GITHUB_APP_ID = Number(process.env.GITHUB_APP_ID);
    const GITHUB_APP_NAME = process.env.GITHUB_APP_NAME;

    // Method 1: Try to check installations directly
    try {
      const response = await fetch('https://api.github.com/user/installations', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
        },
      });

      console.log('📡 GitHub API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📋 GitHub installations data:', JSON.stringify(data, null, 2));
        
        console.log('🔧 Looking for GitHub App:', { GITHUB_APP_ID, GITHUB_APP_NAME });
        
        let foundInstallationId: number | null = null;
        const hasInstallation = Array.isArray(data.installations) && data.installations.some(
          (inst: any) => {
            const matches = inst.app_id === GITHUB_APP_ID || inst.app_slug === GITHUB_APP_NAME;
            if (matches) foundInstallationId = inst.id;
            console.log('🔍 Checking installation:', { 
              app_id: inst.app_id, 
              app_slug: inst.app_slug, 
              matches 
            });
            return matches;
          }
        );

        console.log('✅ Installation check result:', hasInstallation);
        return NextResponse.json({ hasInstallation, installationId: foundInstallationId });
      } else {
        const errorText = await response.text();
        console.error('❌ GitHub API error response:', errorText);
        
        if (response.status === 403) {
          console.log('⚠️ 403 error - trying alternative method...');
          // Fall through to alternative method
        } else {
          throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
        }
      }
    } catch (error) {
      console.log('⚠️  First method failed, trying alternative...', error);
    }

    // Method 2: Alternative approach - check if user can access the app
    // This is a simpler check that doesn't require special permissions
    try {
      // Try to get user info to verify the token works
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
        },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log('✅ User token is valid for:', userData.login);
        
        // For now, return false and let the user install manually
        // This is a reasonable fallback since we can't check installations
        return NextResponse.json({ 
          hasInstallation: false,
          message: 'Please install the GitHub App to continue'
        });
      }
    } catch (error) {
      console.error('❌ Alternative method also failed:', error);
    }

    // If all methods fail, return an error
    return NextResponse.json({ 
      error: 'Unable to check GitHub App installation status. Please try installing the app manually.',
      hasInstallation: false
    }, { status: 500 });

  } catch (error) {
    console.error('Error checking GitHub App installation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 