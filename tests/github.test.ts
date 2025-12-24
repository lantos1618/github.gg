#!/usr/bin/env bun

import { test, expect, describe, beforeAll } from 'bun:test';
import { GitHubService } from '@/lib/github';

const apiKey = process.env.GITHUB_PUBLIC_API_KEY;
const hasApiKey = !!apiKey && apiKey.length > 10 && !apiKey.includes('placeholder');

if (!hasApiKey) {
  console.warn('⚠️ Skipping GitHub tests: GITHUB_PUBLIC_API_KEY not configured');
}

describe.skipIf(!hasApiKey)('GitHubService', () => {

test("GitHubService fetches files correctly", async () => {
  const githubService = GitHubService.createPublic();
  const result = await githubService.getRepositoryFiles('preactjs', 'preact', undefined, 5);

  expect(result.owner).toBe('preactjs');
  expect(result.repo).toBe('preact');
  expect(result.files.length).toBeGreaterThan(0);
  expect(result.files.length).toBeLessThanOrEqual(5);
});

test("GitHubService handles non-existent repositories", async () => {
  const githubService = GitHubService.createPublic();
  
  await expect(
    githubService.getRepositoryFiles('nonexistent', 'repo-that-does-not-exist', undefined, 10)
  ).rejects.toThrow('Repository nonexistent/repo-that-does-not-exist not found or not accessible');
});

test("GitHubService respects file limit", async () => {
  const githubService = GitHubService.createPublic();
  const result = await githubService.getRepositoryFiles('preactjs', 'preact', undefined, 3);

  expect(result.files.length).toBeLessThanOrEqual(3);
  expect(result.totalFiles).toBeGreaterThanOrEqual(result.files.length);
});

test("GitHubService filters binary files correctly", async () => {
  const githubService = GitHubService.createPublic();
  const result = await githubService.getRepositoryFiles('preactjs', 'preact', undefined, 50);

  // Check that no binary files are included
  const binaryExtensions = ['.exe', '.dll', '.so', '.dylib', '.bin', '.obj', '.o'];
  const hasBinaryFiles = result.files.some(file => 
    binaryExtensions.some(ext => file.path.endsWith(ext))
  );
  
  expect(hasBinaryFiles).toBe(false);
});

test("GitHubService handles specific refs", async () => {
  const githubService = GitHubService.createPublic();
  const result = await githubService.getRepositoryFiles('preactjs', 'preact', 'main', 5);

  expect(result.owner).toBe('preactjs');
  expect(result.repo).toBe('preact');
  expect(result.ref).toBe('main');
  expect(result.files.length).toBeGreaterThan(0);
});


test("GitHubService fetches files", async () => {
  const githubService = GitHubService.createPublic();
  const result = await githubService.getRepositoryFiles(
    'lantos1618',
    'github.gg',
    'main',
    1000,
    ''
  );
  expect(result.files.length).toBeGreaterThan(0);
  expect(result.files.some(f => f.name === 'tsconfig.json')).toBe(true);
}); 


test("GitHubService fetches files with subdirectory path", async () => {
  const githubService = GitHubService.createPublic();
  const result = await githubService.getRepositoryFiles(
    'lantos1618',
    'github.gg',
    'main',
    1000,
    'src/app'
  );
  expect(result.files.length).toBeGreaterThan(0);
  expect(result.files.some(f => f.name === 'page.tsx' || f.name === 'layout.tsx')).toBe(true);
});

});