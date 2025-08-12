'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/factory';
import { DEV_USERS } from '@/lib/auth/types';

export function DevSignIn() {
  const { signInWithUserId, isLoading } = useAuth();

  const handleSignIn = async (userId: string) => {
    if (signInWithUserId) {
      await signInWithUserId(userId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Select a development user to sign in with:
      </div>
      
      <div className="space-y-3">
        {DEV_USERS.map((user) => (
          <Card key={user.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{user.name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                onClick={() => handleSignIn(user.id)}
                disabled={isLoading}
                className="w-full"
                size="sm"
              >
                {isLoading ? 'Signing in...' : `Sign in as ${user.name}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="text-xs text-muted-foreground text-center">
        These are development-only users for local testing.
      </div>
    </div>
  );
} 