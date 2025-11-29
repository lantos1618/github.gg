import { TRPCError } from '@trpc/server';
import { parseError } from '@/lib/types/errors';

export function handleTRPCGitHubError(error: unknown): never {
  const errorMessage = parseError(error);
  
  // Check for 401 Bad Credentials specifically
  if (errorMessage.includes('Bad credentials') || errorMessage.includes('401')) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'GitHub authentication failed: Bad credentials or token expired.',
      cause: error,
    });
  }

  if (errorMessage.includes('403') || errorMessage.includes('API rate limit exceeded')) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'GitHub API rate limit exceeded or insufficient permissions.',
      cause: error,
    });
  }

  if (errorMessage.includes('not found') || errorMessage.includes('404')) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Repository or resource not found.',
      cause: error,
    });
  }

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: `GitHub API Error: ${errorMessage}`,
    cause: error,
  });
}

