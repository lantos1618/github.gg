import { describe, expect, it } from 'bun:test';
import { safeLocalPath } from '../src/lib/utils/safe-local-path';
import { buildGitHubAppInstallUrl } from '../src/lib/github/install-url';

describe('same-origin navigation paths', () => {
  it('keeps ordinary return paths and query strings', () => {
    expect(safeLocalPath('/settings?tab=api-keys#active')).toBe('/settings?tab=api-keys#active');
    expect(safeLocalPath('/')).toBe('/');
    expect(safeLocalPath('/search?q=100%25')).toBe('/search?q=100%25');
    expect(buildGitHubAppInstallUrl('/settings?tab=api-keys'))
      .toContain('state=%2Fsettings%3Ftab%3Dapi-keys');
  });

  it('rejects script URLs and external redirects', () => {
    for (const value of [
      'javascript:alert(1)',
      'https://attacker.example/',
      '//attacker.example/',
      '/\\attacker.example/',
      '/%5cattacker.example/',
      '/%255cattacker.example/',
      '/%2fattacker.example/',
      '/%252fattacker.example/',
      '/\nattacker.example/',
    ]) {
      expect(safeLocalPath(value)).toBeNull();
      expect(buildGitHubAppInstallUrl(value)).not.toContain('state=');
    }
  });
});
