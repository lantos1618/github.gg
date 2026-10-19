/** Return a canonical same-origin path suitable for client-side navigation. */
export function safeLocalPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/')) return null;

  // URL parsers treat backslashes as slashes for HTTP(S). Check every decoded
  // layer so an encoded or double-encoded network-path URL cannot slip through.
  let decoded = value;
  for (let i = 0; i < 16; i++) {
    if (decoded.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(decoded)) return null;
    if (!/%[0-9a-f]{2}/i.test(decoded)) break;
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      return null;
    }
  }
  if (/%[0-9a-f]{2}/i.test(decoded) || decoded.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(decoded)) {
    return null;
  }

  try {
    const origin = 'https://github.gg';
    const parsed = new URL(value, origin);
    if (parsed.origin !== origin) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
