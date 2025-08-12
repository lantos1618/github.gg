'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth, isDevAuthMode } from '@/lib/auth/factory';
import { DevSignIn } from './DevSignIn';
import { Github } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function SignInButton() {
  const { signIn, isLoading } = useAuth();
  const [showDevAuth, setShowDevAuth] = useState(false);
  const isDevMode = isDevAuthMode();

  // Handle click for production mode (GitHub OAuth)
  const handleProductionSignIn = () => {
    signIn();
  };

  // Base button that works in both modes
  const baseButton = (
    <Button 
      onClick={isDevMode ? undefined : handleProductionSignIn} 
      size="sm" 
      className="px-2 sm:px-3" 
      disabled={isLoading}
    >
      <Github className="h-4 w-4 sm:mr-2" />
      <span className="hidden sm:inline">
        {isLoading ? 'Signing in...' : 'Sign in with GitHub'}
      </span>
    </Button>
  );

  // In development mode, wrap with dialog for dev auth
  if (isDevMode) {
    return (
      <Dialog open={showDevAuth} onOpenChange={setShowDevAuth}>
        <DialogTrigger asChild>
          {baseButton}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Development Authentication</DialogTitle>
            <DialogDescription>
              Choose a development user to sign in with
            </DialogDescription>
          </DialogHeader>
          <DevSignIn />
        </DialogContent>
      </Dialog>
    );
  }

  // Production mode - direct GitHub OAuth
  return baseButton;
} 