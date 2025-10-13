import { NextRequest, NextResponse } from 'next/server';
import { sendFeatureRequestEmail } from '@/lib/email/resend';

export async function POST(request: NextRequest) {
  try {
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

    await sendFeatureRequestEmail({
      userEmail: email,
      featureRequest: feature,
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
