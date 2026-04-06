'use client';

import { useAuth } from '@/lib/auth/client';
import { useSessionHint } from '@/lib/session-context';
import { SignInButton } from './SignInButton';
import { ProfileDropdownMenu } from './profile/ProfileDropdownMenu';
import type { User } from '@/lib/auth/types';

export function NavbarClient() {
  const hint = useSessionHint();
  const { user, isSignedIn, signOut } = useAuth();

  // Use server hint immediately, then live data when available
  const hintUser: User | null = hint
    ? { id: hint.userId, name: hint.name ?? '', email: '', image: hint.image, githubUsername: hint.githubUsername }
    : null;
  const effectiveUser = user ?? hintUser;
  const effectiveSignedIn = isSignedIn || !!hint;

  if (!effectiveSignedIn || !effectiveUser) {
    return <SignInButton />;
  }

  return (
    <ProfileDropdownMenu user={effectiveUser} onSignOut={signOut} isAdmin={hint?.isAdmin ?? false} />
  );
} 