import { NextResponse } from 'next/server';

/**
 * Compatibility endpoint for older browser bundles that still call this path
 * before signing out. A GitHub App installation belongs to the account, not
 * the browser session, so signing out must never unlink it.
 */
export async function POST() {
  return NextResponse.json({ success: true });
}
