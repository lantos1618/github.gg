import { describe, it, expect } from 'bun:test';

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
        ref = rest[2];
        pathParts = rest.slice(3);
      } else {
        // Format: /user/repo/branch/path (direct branch reference)
        ref = rest[1];
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
}); 