import { NextRequest, NextResponse } from 'next/server';
import { sendFeatureRequestEmail } from '@/lib/email/resend';
import { checkFeatureRequestRateLimit } from '@/lib/rate-limit/feature-request';

const MAX_BODY_BYTES = 24 * 1024;
const MAX_EMAIL_LENGTH = 254;
const MAX_FEATURE_LENGTH = 5000;
// The accepted characters are also safe in the feature email's HTML heading.
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;

class RequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function readBoundedJson(request: NextRequest): Promise<unknown> {
  const declaredLength = request.headers.get('content-length');
  if (declaredLength && Number(declaredLength) > MAX_BODY_BYTES) {
    throw new RequestError('Request body is too large', 413);
  }

  const reader = request.body?.getReader();
  if (!reader) {
    throw new RequestError('Invalid JSON body', 400);
  }

  const decoder = new TextDecoder('utf-8', { fatal: true });
  let body = '';
  let bytesRead = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        throw new RequestError('Request body is too large', 413);
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    return JSON.parse(body) as unknown;
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError('Invalid JSON body', 400);
  } finally {
    reader.releaseLock();
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#39;';
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() !== 'application/json') {
      throw new RequestError('Content-Type must be application/json', 415);
    }

    const body = await readBoundedJson(request);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new RequestError('Email and feature request are required', 400);
    }

    const { email: rawEmail, feature: rawFeature } = body as Record<string, unknown>;
    if (typeof rawEmail !== 'string' || typeof rawFeature !== 'string') {
      throw new RequestError('Email and feature request must be text', 400);
    }
    if (rawEmail.length > MAX_EMAIL_LENGTH || rawFeature.length > MAX_FEATURE_LENGTH) {
      throw new RequestError('Email or feature request is too long', 400);
    }

    const email = rawEmail.trim();
    const feature = rawFeature.trim();
    if (!email || !feature) {
      throw new RequestError('Email and feature request are required', 400);
    }
    if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
      throw new RequestError('Invalid email address', 400);
    }

    const rateLimit = await checkFeatureRequestRateLimit(email);
    if (rateLimit.status === 'unavailable') {
      return NextResponse.json(
        { error: 'Feature requests are temporarily unavailable' },
        { status: 503 }
      );
    }
    if (rateLimit.status === 'limited') {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

    // The email template interpolates this value into HTML.
    await sendFeatureRequestEmail({ userEmail: email, featureRequest: escapeHtml(feature) });

    return NextResponse.json(
      { success: true, message: 'Feature request sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof RequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error sending feature request:', error);
    return NextResponse.json(
      { error: 'Failed to send feature request' },
      { status: 500 }
    );
  }
}
