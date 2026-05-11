import { google } from '@ai-sdk/google';

/**
 * Centralized AI model configuration.
 * Change the model name here to update all AI features at once.
 */
export const GEMINI_PRO = google('models/gemini-3.1-pro-preview');
// Flash-lite is GA as of the 3.1 family — use the stable channel name
// (no `-preview` suffix) so we don't get pulled out from under by Google's
// preview deprecation schedule. Full 3.1 Flash doesn't exist; if we ever
// want a beefier map-step model the alternative is `gemini-3-flash-preview`
// (3.0 family, "full" Flash).
export const GEMINI_FLASH = google('models/gemini-3.1-flash-lite');

/** Model name strings for token usage logging */
export const GEMINI_PRO_MODEL_NAME = 'gemini-3.1-pro-preview';
export const GEMINI_FLASH_MODEL_NAME = 'gemini-3.1-flash-lite';
