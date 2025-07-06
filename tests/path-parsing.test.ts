import { describe, it, expect } from 'bun:test';
import { parseBranchAndPath, parseRepoPathWithBranches } from '../src/lib/utils';

// Mock the path parsing logic from page.tsx
function parseGitHubPath(rest: string[]) {
  let repo: string | undefined;
  let ref: string | undefined;
  let pathParts: string[] = [];
  
  if (rest.length > 0) {
    repo = rest[0];
    
    if (rest.length > 1) {
      // Check if the second segment is 'tree' (GitHub URL structure)
      if (rest[1] === 'tree' && rest.length > 2) {
        // Format: /user/repo/tree/branch/path
        // Handle URL-encoded branch names (e.g., feat%2Fthisthing -> feat/thisthing)
        const encodedRef = rest[2];
        ref = decodeURIComponent(encodedRef);
        pathParts = rest.slice(3);
      } else {
        // Format: /user/repo/branch/path (direct branch reference)
        const encodedRef = rest[1];
        ref = decodeURIComponent(encodedRef);
        pathParts = rest.slice(2);
      }
    }
  }
  
  const path = pathParts.length > 0 ? pathParts.join('/') : undefined;
  
  return { repo, ref, path, pathParts };
}

describe('GitHub URL Path Parsing', () => {
  it('should parse GitHub tree URLs correctly', () => {
    // Test case: lantos1618/lynlang/tree/master/examples
    const result = parseGitHubPath(['lynlang', 'tree', 'master', 'examples']);
    
    expect(result.repo).toBe('lynlang');
    expect(result.ref).toBe('master');
    expect(result.path).toBe('examples');
    expect(result.pathParts).toEqual(['examples']);
  });

  it('should parse GitHub tree URLs with nested paths', () => {
    // Test case: lantos1618/lynlang/tree/master/examples/basic
    const result = parseGitHubPath(['lynlang', 'tree', 'master', 'examples', 'basic']);
    
    expect(result.repo).toBe('lynlang');
    expect(result.ref).toBe('master');
    expect(result.path).toBe('examples/basic');
    expect(result.pathParts).toEqual(['examples', 'basic']);
  });

  it('should parse direct branch URLs correctly', () => {
    // Test case: lantos1618/lynlang/main/src
    const result = parseGitHubPath(['lynlang', 'main', 'src']);
    
    expect(result.repo).toBe('lynlang');
    expect(result.ref).toBe('main');
    expect(result.path).toBe('src');
    expect(result.pathParts).toEqual(['src']);
  });

  it('should handle URLs with just repo name', () => {
    // Test case: lantos1618/lynlang
    const result = parseGitHubPath(['lynlang']);
    
    expect(result.repo).toBe('lynlang');
    expect(result.ref).toBeUndefined();
    expect(result.path).toBeUndefined();
    expect(result.pathParts).toEqual([]);
  });

  it('should handle empty path array', () => {
    const result = parseGitHubPath([]);
    
    expect(result.repo).toBeUndefined();
    expect(result.ref).toBeUndefined();
    expect(result.path).toBeUndefined();
    expect(result.pathParts).toEqual([]);
  });

  it('should handle edge case with tree but no branch', () => {
    // Test case: lantos1618/lynlang/tree
    const result = parseGitHubPath(['lynlang', 'tree']);
    
    expect(result.repo).toBe('lynlang');
    expect(result.ref).toBe('tree');
    expect(result.path).toBeUndefined();
    expect(result.pathParts).toEqual([]);
  });

  it('should handle branch names with slashes correctly', () => {
    // Test case: kepler16/kmono/tree/jv%2Fkxoosrpyvqlm
    // This should parse jv/kxoosrpyvqlm as the branch name, not jv as branch and kxoosrpyvqlm as path
    const result = parseGitHubPath(['kmono', 'tree', 'jv%2Fkxoosrpyvqlm']);
    
    expect(result.repo).toBe('kmono');
    expect(result.ref).toBe('jv/kxoosrpyvqlm'); // This will now pass
    expect(result.path).toBeUndefined();
    expect(result.pathParts).toEqual([]);
  });

  it('should handle branch names with slashes and additional path', () => {
    // Test case: kepler16/kmono/tree/feat%2Fthisthing/src/components
    const result = parseGitHubPath(['kmono', 'tree', 'feat%2Fthisthing', 'src', 'components']);
    
    expect(result.repo).toBe('kmono');
    expect(result.ref).toBe('feat/thisthing'); // This will now pass
    expect(result.path).toBe('src/components');
    expect(result.pathParts).toEqual(['src', 'components']);
  });
});

describe('Enhanced Branch and Path Parsing', () => {
  const branchNames = [
    'main',
    'develop',
    'feat',
    'feat/thisthing',
    'feat/thisthing/src',
    'jv/kxoosrpyvqlm',
    'bugfix/issue-123',
    'release/v1.0.0'
  ];

  it('should match exact branch name', () => {
    const result = parseBranchAndPath(['main'], branchNames);
    expect(result.branch).toBe('main');
    expect(result.path).toBeUndefined();
  });

  it('should match branch name with slash', () => {
    const result = parseBranchAndPath(['feat', 'thisthing'], branchNames);
    expect(result.branch).toBe('feat/thisthing');
    expect(result.path).toBeUndefined();
  });

  it('should match longest possible branch name', () => {
    const result = parseBranchAndPath(['feat', 'thisthing', 'src', 'components'], branchNames);
    expect(result.branch).toBe('feat/thisthing/src');
    expect(result.path).toBe('components');
  });

  it('should handle branch with slash and additional path', () => {
    const result = parseBranchAndPath(['jv', 'kxoosrpyvqlm', 'src', 'lib'], branchNames);
    expect(result.branch).toBe('jv/kxoosrpyvqlm');
    expect(result.path).toBe('src/lib');
  });

  it('should handle complex branch names', () => {
    const result = parseBranchAndPath(['bugfix', 'issue-123', 'test', 'unit'], branchNames);
    expect(result.branch).toBe('bugfix/issue-123');
    expect(result.path).toBe('test/unit');
  });

  it('should handle release branches', () => {
    const result = parseBranchAndPath(['release', 'v1.0.0', 'docs'], branchNames);
    expect(result.branch).toBe('release/v1.0.0');
    expect(result.path).toBe('docs');
  });

  it('should fallback to first segment if no match', () => {
    const result = parseBranchAndPath(['unknown', 'branch', 'path'], branchNames);
    expect(result.branch).toBe('unknown');
    expect(result.path).toBe('branch/path');
  });

  it('should handle empty segments', () => {
    const result = parseBranchAndPath([], branchNames);
    expect(result.branch).toBe('main');
    expect(result.path).toBeUndefined();
  });

  it('should handle single segment that is not a branch', () => {
    const result = parseBranchAndPath(['not-a-branch'], branchNames);
    expect(result.branch).toBe('not-a-branch');
    expect(result.path).toBeUndefined();
  });

  it('should prioritize longer matches over shorter ones', () => {
    // This tests that 'feat/thisthing/src' is matched over 'feat/thisthing'
    const result = parseBranchAndPath(['feat', 'thisthing', 'src', 'utils'], branchNames);
    expect(result.branch).toBe('feat/thisthing/src');
    expect(result.path).toBe('utils');
  });

  it('should generate properly encoded currentPath', () => {
    const params = {
      user: 'kepler16',
      params: ['kmono', 'tree', 'jv', 'kxoosrpyvqlm', 'src', 'lib']
    };
    const result = parseRepoPathWithBranches(params, branchNames);
    
    expect(result.user).toBe('kepler16');
    expect(result.repo).toBe('kmono');
    expect(result.ref).toBe('jv/kxoosrpyvqlm');
    expect(result.path).toBe('src/lib');
    expect(result.currentPath).toBe('/kepler16/kmono/tree/jv%2Fkxoosrpyvqlm/src/lib');
  });

  it('should parse real-world branch with slash and subdirectory (kepler16/gx.cljc)', () => {
    // Simulate real branch list from kepler16/gx.cljc
    const branchNames = [
      'main',
      'jv/ref-stowyxvtroxx',
      // ...other branches
    ];
    // URL: /kepler16/gx.cljc/tree/jv%2Fref-stowyxvtroxx/examples
    const segments = ['jv', 'ref-stowyxvtroxx', 'examples'];
    const result = parseBranchAndPath(segments, branchNames);
    expect(result.branch).toBe('jv/ref-stowyxvtroxx');
    expect(result.path).toBe('examples');
  });
}); 