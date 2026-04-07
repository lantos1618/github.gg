'use client';

import { useAuthWithHint } from '@/lib/hooks/useAuthWithHint';
import { useSessionHint } from '@/lib/session-context';
import { SignInButton } from './SignInButton';
import { ProfileDropdownMenu } from './profile/ProfileDropdownMenu';

export function NavbarClient() {
  const hint = useSessionHint();
  const { user, isSignedIn, signOut } = useAuthWithHint();

  if (!isSignedIn || !user) {
    return <SignInButton />;
  }

  return (
    <ProfileDropdownMenu user={user} onSignOut={signOut} isAdmin={hint?.isAdmin ?? false} />
  );
}
