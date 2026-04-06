'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/client';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

function SignInContent() {
  const { signIn, isSignedIn, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectTo = searchParams.get('redirect') || '/';

  useEffect(() => {
    if (isLoading) return;
    if (isSignedIn) {
      router.replace(redirectTo);
    } else {
      signIn(redirectTo);
    }
  }, [isSignedIn, isLoading, signIn, redirectTo, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="animate-pulse rounded-full bg-gray-200 h-12 w-12 mx-auto" />
        <p className="text-sm text-gray-500">Redirecting to sign in...</p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
