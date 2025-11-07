/**
 * Dev Environment API
 * Direct HTTP API for environment management
 */

import { NextRequest, NextResponse } from 'next/server';
import { orchestrator } from '@/lib/dev-env/orchestrator';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

/**
 * GET /api/dev-env - List user's environments
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const environments = await orchestrator.listEnvironments(session.user.id);

    return NextResponse.json({
      success: true,
      data: environments,
    });
  } catch (error: any) {
    console.error('Error listing environments:', error);
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
 * POST /api/dev-env - Create a new environment
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const environment = await orchestrator.createEnvironment({
      userId: session.user.id,
      name: body.name,
      resources: body.resources,
      durationHours: body.durationHours || 24,
      repositoryUrl: body.repositoryUrl,
      initScript: body.initScript,
      environmentVars: body.environmentVars,
    });

    return NextResponse.json({
      success: true,
      data: environment,
    });
  } catch (error: any) {
    console.error('Error creating environment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
