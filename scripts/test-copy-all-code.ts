// Test script for the "Copy All Code" feature
import { getRepositoryAsText } from '../lib/github';

// Test with a public repository
const TEST_OWNER = 'facebook';
const TEST_REPO = 'react';
const TEST_BRANCH = 'main';

async function testCopyAllCode() {
  console.log(`Testing "Copy All Code" with ${TEST_OWNER}/${TEST_REPO} (${TEST_BRANCH})`);
  
  try {
    // Get repository content as text
    const startTime = Date.now();
    const { files, error } = await getRepositoryAsText(
      TEST_OWNER,
      TEST_REPO,
      TEST_BRANCH
    );
    const endTime = Date.now();
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    // Log the results
    console.log('✅ Successfully fetched repository content');
    console.log(`📊 Files processed: ${files.length}`);
    console.log(`⏱️  Time taken: ${(endTime - startTime) / 1000} seconds`);
    
    // Log sample files
    console.log('\nSample files:');
    files.slice(0, 5).forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.path} (${file.size} bytes)`);
      if (file.truncated) {
        console.log('     ⚠️  File was too large and was truncated');
      }
    });
    
    if (files.length > 5) {
      console.log(`  ...and ${files.length - 5} more files`);
    }
    
  } catch (error) {
    console.error('❌ Unhandled error:', error);
  }
}

// Run the test
testCopyAllCode().catch(console.error);
