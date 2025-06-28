'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { useGitHubAppAuth } from '@/lib/hooks/useGitHubAppAuth';
import { StarCount } from './StarCount';
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
import { Spinner } from '@/components/ui/spinner';
import { useEffect, useState } from 'react';

export function Navbar() {
  const { isSignedIn, isLoading, user, signIn, signOut } = useAuth();
  const { session: appSession } = useGitHubAppAuth();
  const [checkingInstall, setCheckingInstall] = useState(false);
  const [hasInstallation, setHasInstallation] = useState<boolean | null>(null);
  const [installationId, setInstallationId] = useState<number | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      setHasInstallation(null);
      setInstallationId(null);
      setCheckingInstall(false);
      return;
    }
    setCheckingInstall(true);
    fetch('/api/auth/check-installation')
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setHasInstallation(data.hasInstallation);
        if (data.installationId) setInstallationId(data.installationId);
        else setInstallationId(null);
      })
      .catch(() => {
        setHasInstallation(null);
        setInstallationId(null);
      })
      .finally(() => setCheckingInstall(false));
  }, [isSignedIn, user]);

  return (
    <nav className={`sticky top-0 z-50 w-full backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300 relative`}>
      <div className="container flex h-14 items-center px-4 sm:px-6">
        {/* Logo/Brand */}
        <Link href="/" className="mr-auto flex items-center gap-2">
          <span className="font-bold sm:hidden">gh.gg</span>
          <span className="font-bold hidden sm:inline">
            github.gg
          </span>
        </Link>

        {/* Navigation Actions */}
        <div className="flex items-center gap-4">
          {/* Star Button */}
          <StarCount owner="lantos1618" repo="github.gg" />

          {/* Auth Button */}
          {isLoading ? (
             <div className="flex items-center justify-center w-8 h-8">
                <Spinner size={16} />
              </div>
          ) : isSignedIn && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image!} alt={user.name} />
                    <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                  </Avatar>
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
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {checkingInstall ? (
                  <DropdownMenuItem disabled>
                    Checking installation...
                  </DropdownMenuItem>
                ) : hasInstallation === false ? (
                  <DropdownMenuItem asChild>
                    <a href={`https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_NAME}/installations/new`} target="_blank" rel="noopener noreferrer">
                      <Github className="mr-2 h-4 w-4" />
                      <span>Install GitHub App</span>
                    </a>
                  </DropdownMenuItem>
                ) : hasInstallation === true && installationId ? (
                  <DropdownMenuItem asChild>
                    <a href={`https://github.com/settings/installations/${installationId}`} target="_blank" rel="noopener noreferrer" className="text-red-600">
                      <Github className="mr-2 h-4 w-4" />
                      <span>Uninstall GitHub App</span>
                    </a>
                  </DropdownMenuItem>
                ) : hasInstallation === true ? (
                  <DropdownMenuItem asChild>
                    <a href="https://github.com/settings/installations" target="_blank" rel="noopener noreferrer" className="text-red-600">
                      <Github className="mr-2 h-4 w-4" />
                      <span>Uninstall GitHub App</span>
                    </a>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={signIn} size="sm" className="px-2 sm:px-3">
              <Github className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign in with GitHub</span>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
} 