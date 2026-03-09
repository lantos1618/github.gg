'use client';

import { useAuth } from '@/lib/auth/client';
import { SignInButton } from './SignInButton';
import { ProfileDropdownMenu } from './profile/ProfileDropdownMenu';

export function NavbarClient() {
  const { user, isSignedIn, isLoading, signOut } = useAuth();

  // Always render SignInButton during SSR and loading to prevent hydration mismatch
  if (isLoading) {
    return <SignInButton />;
  }

  return (
    <>
      {isSignedIn ? (
        <ProfileDropdownMenu user={user ?? null} onSignOut={signOut} />
      ) : (
        <SignInButton />
      )}
    </>
  );
} 