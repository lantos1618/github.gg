'use client';

import { useAuth } from '@/lib/auth/factory';
import { SignInButton } from './SignInButton';
import { ProfileDropdownMenu } from './profile/ProfileDropdownMenu';

export function NavbarClient() {
  const { user, isSignedIn, signOut } = useAuth();

  return (
    <>
      {isSignedIn ? (
        <ProfileDropdownMenu user={user} onSignOut={signOut} />
      ) : (
        <SignInButton />
      )}
    </>
  );
} 