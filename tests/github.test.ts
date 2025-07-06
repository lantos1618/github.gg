#!/usr/bin/env bun

import { test, expect } from 'bun:test';
import { GitHubService } from '@/lib/github';

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


test("GitHubService fetches files from a branch with slash  (codex/fix-paywall-and-github-repository-issues)", async () => {
  const githubService = GitHubService.createPublic();
  const result = await githubService.getRepositoryFiles(
    'lantos1618',
    'github.gg',
    'codex/fix-paywall-and-github-repository-issues',
    1000,
    ''
  );
  expect(result.files.length).toBeGreaterThan(0);
  expect(result.files.some(f => f.name === 'tsconfig.json')).toBe(true);
}); 

test("GitHubService fetches files from a branch with slash and subdirectory (codex/fix-paywall-and-github-repository-issues)", async () => {
  const githubService = GitHubService.createPublic();
  const ref = 'codex/fix-paywall-and-github-repository-issues';
  const path = 'app/search';
  console.log('DEBUG: ref =', ref, 'path =', path);
  try {
    const result = await githubService.getRepositoryFiles(
      'lantos1618',
      'github.gg',
      ref,
      1000,
      path
    );
    console.log('DEBUG: files returned:', result.files.map(f => f.name));
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.files.some(f => f.name === 'page.tsx')).toBe(true);
  } catch (err) {
    console.error('DEBUG: error fetching files:', err);
    throw err;
  }
}); 