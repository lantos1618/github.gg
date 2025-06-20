'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
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

export function Navbar() {
  const { isSignedIn, isLoading, user, signIn, signOut, isSigningOut } = useAuth();

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4 sm:px-6">
        {/* Logo/Brand */}
        <Link href="/" className="mr-auto flex items-center gap-2">
          <span className="font-bold">
            github.gg
          </span>
        </Link>

        {/* Navigation Actions */}
        <div className="flex items-center gap-4">
          {/* Star Button */}
          <StarCount owner="lantos1618" repo="github.gg" />

          {/* Auth Button */}
          {isLoading ? (
             <div className="flex items-center gap-2 px-4 py-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Loading...</span>
              </div>
          ) : isSignedIn && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image!} alt={user.name!} />
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
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} disabled={isSigningOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={signIn}>
              <Github className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
} 