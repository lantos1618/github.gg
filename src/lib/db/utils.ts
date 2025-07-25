export function isPgErrorWithCode(e: unknown): e is { code: string } {
  return typeof e === 'object' && e !== null && 'code' in e && typeof (e as { code?: unknown }).code === 'string';
} 