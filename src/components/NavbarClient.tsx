'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User, Github, Crown, Bell, Trophy } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { trpc } from '@/lib/trpc/client';
import Link from 'next/link';
import { Spinner } from './ui/spinner';
import { useInstallationStatus } from '@/lib/hooks/useInstallationStatus';

export function NavbarClient() {
  const { user, isSignedIn, signIn, signOut, isLoading } = useAuth();
  
  const { 
    hasInstallation, 
    installationId, 
    isLoading: isInstallationLoading
  } = useInstallationStatus();

  const { data: adminStatus } = trpc.admin.isAdmin.useQuery(undefined, {
    enabled: isSignedIn,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return <Button variant="ghost" size="sm" className="w-24 justify-center"><Spinner size={16} /></Button>;
  }

  if (isSignedIn && user) {
    const isAdmin = !!adminStatus?.isAdmin;
    const showInstallNotification = !isInstallationLoading && !hasInstallation;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.image!} alt={user.name} />
              <AvatarFallback>{user.name?.[0]}</AvatarFallback>
            </Avatar>
            {showInstallNotification && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col space-y-1'>
              <p className='text-sm font-medium leading-none'>{user.name}</p>
              <p className='text-xs leading-none text-muted-foreground'>@{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {showInstallNotification ? (
            <DropdownMenuItem asChild className="bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-200 focus:bg-green-100 dark:focus:bg-green-950/30">
              <Link href={`https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_NAME}/installations/new`} target="_blank" rel="noopener noreferrer">
                <Bell className="mr-2 h-4 w-4" />
                <span>Install GitHub App</span>
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem asChild>
              <Link href={`https://github.com/settings/installations/${installationId}`} target="_blank" rel="noopener noreferrer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Manage GitHub App</span>
              </Link>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem asChild>
            <Link href="/arena">
              <Trophy className="mr-2 h-4 w-4" />
              <span>Dev Arena</span>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <User className="mr-2 h-4 w-4" />
              <span>Settings & Billing</span>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link href="/pricing">
              <Crown className="mr-2 h-4 w-4" />
              <span>Upgrade Plan</span>
            </Link>
          </DropdownMenuItem>
          
          {isAdmin && (
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <Crown className="mr-2 h-4 w-4 text-yellow-500" />
                <span>Admin Dashboard</span>
              </Link>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button onClick={signIn} size="sm" className="px-2 sm:px-3">
        <Github className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">Sign in with GitHub</span>
      </Button>
    </div>
  );
} 