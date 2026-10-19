import { afterEach, describe, expect, test } from 'bun:test';
import crypto from 'node:crypto';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { APIKeyCard } from '../src/app/settings/components/APIKeyCard';
import { getStoredApiKeyStatus } from '../src/lib/utils/encryption';

const originalSecret = process.env.API_KEY_ENCRYPTION_SECRET;

afterEach(() => {
  if (originalSecret === undefined) {
    delete process.env.API_KEY_ENCRYPTION_SECRET;
  } else {
    process.env.API_KEY_ENCRYPTION_SECRET = originalSecret;
  }
});

function encryptedFixture(): string {
  const salt = Buffer.alloc(16, 1);
  const iv = Buffer.alloc(16, 2);
  const key = crypto.scryptSync('original-test-secret', salt, 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([
    cipher.update('AIza-test-only-key', 'utf8'),
    cipher.final(),
  ]);
  return `${salt.toString('hex')}:${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

describe('stored BYOK key status', () => {
  test('does not ask for re-entry when no key is stored', () => {
    expect(getStoredApiKeyStatus(null)).toEqual({ hasKey: false, needsReentry: false });
  });

  test('accepts a key encrypted with the current secret', () => {
    process.env.API_KEY_ENCRYPTION_SECRET = 'original-test-secret';
    expect(getStoredApiKeyStatus(encryptedFixture())).toEqual({
      hasKey: true,
      needsReentry: false,
    });
  });

  test('prompts for re-entry after the encryption secret changes', () => {
    process.env.API_KEY_ENCRYPTION_SECRET = 'replacement-test-secret';
    expect(getStoredApiKeyStatus(encryptedFixture())).toEqual({
      hasKey: false,
      needsReentry: true,
    });
  });

  test('prompts for re-entry when stored ciphertext is corrupt', () => {
    process.env.API_KEY_ENCRYPTION_SECRET = 'original-test-secret';
    expect(getStoredApiKeyStatus('invalid')).toEqual({
      hasKey: false,
      needsReentry: true,
    });
  });
});

test('Settings prompts for direct replacement of an unreadable key', () => {
  const html = renderToStaticMarkup(createElement(APIKeyCard, {
    hasKey: false,
    needsReentry: true,
    apiKey: '',
    showKey: false,
    isSaving: false,
    isDeleting: false,
    onApiKeyChange: () => {},
    onToggleVisibility: () => {},
    onSave: () => {},
    onDelete: () => {},
  }));

  expect(html).toContain('Your saved Gemini API key can no longer be read');
  expect(html).toContain('data-testid="settings-apikey-input"');
  expect(html).not.toContain('API key is configured');
});
