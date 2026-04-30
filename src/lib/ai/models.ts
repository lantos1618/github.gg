import { google } from '@ai-sdk/google';

/**
 * Centralized AI model configuration.
 * Change the model name here to update all AI features at once.
 */
export const GEMINI_PRO = google('models/gemini-3.1-pro-preview');
// `gemini-3.1-flash` (full) doesn't exist on v1beta — only the lite variant.
// 3.x flash options: gemini-3-flash-preview (3.0) | gemini-3.1-flash-lite-preview (3.1).
export const GEMINI_FLASH = google('models/gemini-3.1-flash-lite-preview');

/** Model name strings for token usage logging */
export const GEMINI_PRO_MODEL_NAME = 'gemini-3.1-pro-preview';
export const GEMINI_FLASH_MODEL_NAME = 'gemini-3.1-flash-lite-preview';
