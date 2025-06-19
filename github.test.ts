#!/usr/bin/env bun

// Load environment variables
import { config } from 'dotenv';
config({ path: '.env.local' });

import { GitHubService } from './src/lib/github';

async function testGitHubAPI() {
  console.log('🧪 Testing GitHub API...\n');

  // Create GitHub service
  const githubService = new GitHubService();
  console.log('✅ GitHub service created');

  // Test with preact repository
  console.log('📦 Testing with preactjs/preact repository...');
  
  const result = await githubService.getRepositoryFiles(
    'preactjs',
    'preact',
    undefined,
    5 // Just get 5 files for testing
  );

  console.log('\n✅ SUCCESS! GitHub API is working correctly');
  console.log(`📊 Results:`);
  console.log(`   Owner: ${result.owner}`);
  console.log(`   Repo: ${result.repo}`);
  console.log(`   Ref: ${result.ref}`);
  console.log(`   Total Files: ${result.totalFiles}`);
  console.log(`   Sample Files:`);
  result.files.slice(0, 3).forEach((file, i) => {
    console.log(`     ${i + 1}. ${file.path} (${file.content.length} chars)`);
  });

  // Basic validation
  if (result.owner !== 'preactjs') {
    throw new Error('Owner mismatch');
  }
  if (result.repo !== 'preact') {
    throw new Error('Repo mismatch');
  }
  if (result.files.length === 0) {
    throw new Error('No files returned');
  }
  if (result.files.length > 5) {
    throw new Error('Too many files returned');
  }
  
  console.log('\n🎉 All tests passed!');
}

// Run the test
testGitHubAPI().catch(console.error); 