const { expect } = require('jest');

describe('Dev Project', () => {
  test('should have correct configuration', () => {
    const config = require('../src/index.js');
    expect(config.version).toBe('1.0.0');
  });

  test('should have development environment', () => {
    const config = require('../src/index.js');
    expect(config.environment).toBe('development');
  });

  test('should have required features', () => {
    const config = require('../src/index.js');
    expect(config.features).toContain('testing');
    expect(config.features).toContain('development');
  });
}); 