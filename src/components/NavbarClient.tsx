'use client';

import { useAuth } from '@/lib/auth/factory';
import { SignInButton } from './SignInButton';
import { UserNav } from './profile/UserNav';

export function NavbarClient() {
  const { user, isSignedIn, signOut } = useAuth();

  return (
    <>
      {isSignedIn ? (
        <UserNav user={user} onSignOut={signOut} />
      ) : (
        <SignInButton />
      )}
    </>
  );
} 