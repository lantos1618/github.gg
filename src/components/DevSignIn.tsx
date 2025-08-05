'use client';

import { useState } from 'react';
import { useDevAuth, DEV_USERS } from '@/lib/auth/dev-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export function DevSignIn() {
  const { user, signIn, signOut, isLoading } = useDevAuth();
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const handleSignIn = async () => {
    if (selectedUserId) {
      await signIn(selectedUserId);
      // Close the dialog after successful sign in
      // The dialog will be controlled by the parent component
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant="secondary">DEV MODE</Badge>
            Signed In
          </CardTitle>
          <CardDescription>
            You are signed in as a development user
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={user.image} alt={user.name} />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground">@{user.githubUsername}</p>
            </div>
          </div>
          <Button 
            onClick={handleSignOut} 
            variant="outline" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Signing out...' : 'Sign Out'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Badge variant="secondary">DEV MODE</Badge>
          Development Sign In
        </CardTitle>
        <CardDescription>
          Choose a development user to sign in with
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {DEV_USERS.map((devUser) => (
            <div
              key={devUser.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedUserId === devUser.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setSelectedUserId(devUser.id)}
            >
              <Avatar>
                <AvatarImage src={devUser.image} alt={devUser.name} />
                <AvatarFallback>{devUser.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{devUser.name}</p>
                <p className="text-sm text-muted-foreground">{devUser.email}</p>
                <p className="text-xs text-muted-foreground">@{devUser.githubUsername}</p>
              </div>
            </div>
          ))}
        </div>
        
        <Button 
          onClick={handleSignIn} 
          className="w-full"
          disabled={!selectedUserId || isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>
        
        <p className="text-xs text-muted-foreground text-center">
          This is development mode. In production, you would sign in with GitHub OAuth.
        </p>
      </CardContent>
    </Card>
  );
} 