'use client';

import { useAuth } from '@/lib/auth/factory';
import { SignInButton } from './SignInButton';
import { UserNav } from './profile/UserNav';

export function NavbarClient() {
  const { user, isSignedIn, signOut } = useAuth();

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          {isSignedIn ? (
            <UserNav user={user} onSignOut={signOut} />
          ) : (
            <SignInButton />
          )}
        </div>
      </div>
    </nav>
  );
} 