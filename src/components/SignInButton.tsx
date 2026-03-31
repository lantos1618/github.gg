'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/client';
import { Github } from 'lucide-react';

export function SignInButton() {
  const { signIn, isLoading } = useAuth();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const showLoading = hasMounted && isLoading;

  return (
    <button
      onClick={() => signIn()}
      disabled={showLoading}
      data-testid="nav-signin-btn"
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#111] text-white text-base font-medium rounded-md hover:bg-[#333] transition-colors disabled:opacity-50 cursor-pointer"
    >
      <Github className="h-4 w-4" />
      <span className="hidden sm:inline">
        {showLoading ? 'Signing in...' : 'Sign in'}
      </span>
    </button>
  );
}
