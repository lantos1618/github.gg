/**
 * Individual Dev Environment API
 * Operations on specific environments
 */

import { NextRequest, NextResponse } from 'next/server';
import { orchestrator } from '@/lib/dev-env/orchestrator';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/dev-env/[id] - Get environment details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const environment = await orchestrator.getEnvironment(id);

    if (!environment) {
      return NextResponse.json(
        { error: 'Environment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: environment,
    });
  } catch (error: any) {
    console.error('Error getting environment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dev-env/[id] - Destroy environment
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await orchestrator.destroyEnvironment(id, session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Environment destroyed',
    });
  } catch (error: any) {
    console.error('Error destroying environment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/dev-env/[id] - Update environment state
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    if (body.state) {
      await orchestrator.transitionState(id, body.state, body.metadata);
    }

    const environment = await orchestrator.getEnvironment(id);

    return NextResponse.json({
      success: true,
      data: environment,
    });
  } catch (error: any) {
    console.error('Error updating environment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
