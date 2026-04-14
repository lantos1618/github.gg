import { NextRequest, NextResponse } from 'next/server';
import { sendFeatureRequestEmail } from '@/lib/email/resend';
import { checkIPRateLimit } from '@/lib/webhooks/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP to prevent abuse
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { allowed } = checkIPRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, feature } = body;

    if (!email || !feature) {
      return NextResponse.json(
        { error: 'Email and feature request are required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Cap feature request length to prevent abuse
    const sanitizedFeature = feature.slice(0, 5000);

    await sendFeatureRequestEmail({
      userEmail: email,
      featureRequest: sanitizedFeature,
    });

    return NextResponse.json(
      { success: true, message: 'Feature request sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending feature request:', error);
    return NextResponse.json(
      { error: 'Failed to send feature request' },
      { status: 500 }
    );
  }
}
