'use client';

import { UnifiedSession } from '@/lib/auth-server';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signIn, signOut } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc/client';

interface NavbarClientProps {
  session: UnifiedSession;
}

export function NavbarClient({ session }: NavbarClientProps) {
  // Use tRPC query to check installation status
  const { data: installationInfo } = trpc.github.checkInstallation.useQuery(
    undefined,
    {
      enabled: session.isSignedIn && session.authType === 'oauth',
      refetchOnWindowFocus: false,
    }
  );

  const handleSignIn = async () => {
    await signIn.social({
      provider: "github",
    });
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // Show bell notification when user is signed in but hasn't linked an installation
  const showInstallNotification = session.isSignedIn && session.user && !installationInfo?.hasInstallation;

  if (session.isSignedIn && session.user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarImage src={session.user.image!} alt={session.user.name} />
              <AvatarFallback>{session.user.name?.[0]}</AvatarFallback>
            </Avatar>
            {/* Solid bell notification icon (no tooltip) */}
            {showInstallNotification && (
              <div className="absolute -top-2 -left-2 p-0 m-0 bg-transparent border-none focus:outline-none pointer-events-auto z-20" aria-label="Install the GitHub App to enable private repo access and advanced features." style={{ width: 32, height: 32, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* Solid bell SVG */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-red-500">
                  <path d="M12 2C8.13 2 5 5.13 5 9v4.586l-.707.707A1 1 0 0 0 5 16h14a1 1 0 0 0 .707-1.707L19 13.586V9c0-3.87-3.13-7-7-7zm0 20a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22z" />
                </svg>
              </div>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col space-y-1'>
              <p className='text-sm font-medium leading-none'>{session.user.name}</p>
              <p className='text-xs leading-none text-muted-foreground'>@{session.user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {/* Installation status and management */}
          {!installationInfo?.hasInstallation ? (
            <DropdownMenuItem asChild className="bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/30">
              <a href={`https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_NAME}/installations/new`} target="_blank" rel="noopener noreferrer">
                <Github className="mr-2 h-4 w-4 text-green-600" />
                <span className="text-green-800 dark:text-green-200 font-medium">Install GitHub App</span>
              </a>
            </DropdownMenuItem>
          ) : installationInfo?.installationId ? (
            <DropdownMenuItem asChild>
              <a href={`https://github.com/settings/installations/${installationInfo.installationId}`} target="_blank" rel="noopener noreferrer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Manage GitHub App</span>
              </a>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem asChild>
              <a href="https://github.com/settings/installations" target="_blank" rel="noopener noreferrer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Manage GitHub App</span>
              </a>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button onClick={handleSignIn} size="sm" className="px-2 sm:px-3">
      <Github className="h-4 w-4 sm:mr-2" />
      <span className="hidden sm:inline">Sign in with GitHub</span>
    </Button>
  );
} 