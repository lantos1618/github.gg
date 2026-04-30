import { google } from '@ai-sdk/google';

/**
 * Centralized AI model configuration.
 * Change the model name here to update all AI features at once.
 */
export const GEMINI_PRO = google('models/gemini-3.1-pro-preview');
// `gemini-3.1-flash` doesn't exist on v1beta. The 3.x flash family is
// gemini-3-flash-preview (full) and gemini-3.1-flash-lite-preview (lite).
export const GEMINI_FLASH = google('models/gemini-3-flash-preview');

/** Model name strings for token usage logging */
export const GEMINI_PRO_MODEL_NAME = 'gemini-3.1-pro-preview';
export const GEMINI_FLASH_MODEL_NAME = 'gemini-3-flash-preview';
