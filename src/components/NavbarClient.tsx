'use client';

import { useAuth } from '@/lib/auth/client';
import { SignInButton } from './SignInButton';
import { ProfileDropdownMenu } from './profile/ProfileDropdownMenu';

export function NavbarClient() {
  const { user, isSignedIn, signOut } = useAuth();

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