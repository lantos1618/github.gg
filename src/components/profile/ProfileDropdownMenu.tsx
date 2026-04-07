'use client';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LogOut, Settings, Shield, Zap, Columns2, Columns3, User } from 'lucide-react';
import Link from 'next/link';
import { User as UserType } from '@/lib/auth/types';
import { usePageWidth } from '@/lib/page-width-context';
import { useSessionHint } from '@/lib/session-context';

interface ProfileDropdownMenuProps {
  user: UserType | null;
  onSignOut: () => Promise<void>;
  isAdmin?: boolean;
}

export function ProfileDropdownMenu({ user, onSignOut, isAdmin }: ProfileDropdownMenuProps) {
  const { width, toggle } = usePageWidth();
  const hint = useSessionHint();
  const profileUsername = user?.githubUsername || hint?.githubUsername;
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full" data-testid="nav-user-avatar-btn">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.image ?? undefined} alt={user.name} />
            <AvatarFallback>{user.name?.[0]}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className='font-normal'>
          <div className='flex flex-col space-y-1'>
            <p className='text-sm font-medium leading-none'>{user.name}</p>
            <p className='text-xs leading-none text-muted-foreground'>{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {profileUsername && (
          <DropdownMenuItem asChild>
            <Link href={`/${profileUsername}`} data-testid="nav-user-profile-link">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem asChild>
          <Link href="/automations" data-testid="nav-user-automations-link">
            <Zap className="mr-2 h-4 w-4" />
            <span>Automations</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/settings" data-testid="nav-user-settings-link">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>

        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin" data-testid="nav-user-admin-link">
              <Shield className="mr-2 h-4 w-4" />
              <span>Admin</span>
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={toggle} data-testid="nav-page-width-toggle">
          {width === 'focused' ? <Columns3 className="mr-2 h-4 w-4" /> : <Columns2 className="mr-2 h-4 w-4" />}
          <span>{width === 'focused' ? 'Wide layout' : 'Focused layout'}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} data-testid="nav-user-signout-btn">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
