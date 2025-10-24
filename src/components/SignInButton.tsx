'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/factory';
import { Github } from 'lucide-react';

export function SignInButton() {
  const { signIn, isLoading } = useAuth();

  return (
    <Button
      onClick={signIn}
      size="sm"
      className="px-2 sm:px-3"
      disabled={isLoading}
    >
      <Github className="h-4 w-4 sm:mr-2" />
      <span className="hidden sm:inline">
        {isLoading ? 'Signing in...' : 'Sign in with GitHub'}
      </span>
    </Button>
  );
} 