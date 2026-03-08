'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/client';
import { Github } from 'lucide-react';

export function SignInButton() {
  const { signIn, isLoading } = useAuth();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Show consistent text during SSR and first client render to avoid hydration mismatch
  const showLoading = hasMounted && isLoading;

  return (
    <Button
      onClick={() => signIn()}
      size="sm"
      className="px-2 sm:px-3"
      disabled={showLoading}
      data-testid="nav-signin-btn"
    >
      <Github className="h-4 w-4 sm:mr-2" />
      <span className="hidden sm:inline">
        {showLoading ? 'Signing in...' : 'Sign in with GitHub'}
      </span>
    </Button>
  );
} 