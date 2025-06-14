/**
 * Test script to verify NextAuth.js authentication flow
 * 
 * This script tests:
 * 1. Session retrieval
 * 2. API route protection
 * 3. Rate limiting
 * 
 * Run with: npx tsx scripts/test-auth.ts
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '../app/api/auth/[...nextauth]/route';
import { Octokit } from '@octokit/rest';

async function testAuth() {
  console.log('=== Testing Authentication ===');
  
  try {
    // Test 1: Get server session
    console.log('\n1. Testing server session...');
    const session = await getServerSession(authOptions);
    
    if (session) {
      console.log('✅ Session found (user is logged in)');
      console.log(`- User: ${session.user?.name} (${session.user?.email})`);
    } else {
      console.log('ℹ️ No active session (user is not logged in)');
    }

    // Test 2: Test API route protection
    console.log('\n2. Testing API route protection...');
    const apiUrl = 'http://localhost:3000/api/analyze-repo';
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: 'vercel', repo: 'next.js' })
      });
      
      const data = await response.json();
      
      if (response.status === 200) {
        console.log('✅ API request successful');
      } else if (response.status === 401) {
        console.log('🔒 API route is protected (expected for unauthenticated users)');
        console.log('Message:', data.message);
      } else if (response.status === 429) {
        console.log('⚠️ Rate limit hit (expected for unauthenticated users)');
        console.log('Message:', data.message);
      }
      
      console.log('Response status:', response.status);
      console.log('Rate limit headers:', {
        limit: response.headers.get('X-RateLimit-Limit'),
        remaining: response.headers.get('X-RateLimit-Remaining'),
        reset: response.headers.get('X-RateLimit-Reset'),
        type: response.headers.get('X-RateLimit-Type')
      });
      
    } catch (error) {
      console.error('❌ API request failed:', error);
    }

    // Test 3: Test Octokit integration if authenticated
    if (session?.accessToken) {
      console.log('\n3. Testing Octokit integration...');
      
      try {
        const octokit = new Octokit({ auth: session.accessToken });
        const { data: user } = await octokit.users.getAuthenticated();
        console.log(`✅ Octokit authenticated as: ${user.login}`);
        
        // Test rate limits
        const rateLimit = await octokit.rateLimit.get();
        console.log('GitHub API rate limits:', {
          limit: rateLimit.data.resources.core.limit,
          remaining: rateLimit.data.resources.core.remaining,
          reset: new Date(rateLimit.data.resources.core.reset * 1000).toLocaleTimeString()
        });
        
      } catch (error) {
        console.error('❌ Octokit test failed:', error instanceof Error ? error.message : String(error));
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testAuth();
