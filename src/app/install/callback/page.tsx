'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';

export default function InstallCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isSignedIn, isLoading: authLoading, signIn } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'needs-auth'>('loading');
  const [message, setMessage] = useState('Processing installation...');

  useEffect(() => {
    const installationId = searchParams.get('installation_id');
    const setupAction = searchParams.get('setup_action');

    if (!installationId) {
      setStatus('error');
      setMessage('No installation ID found.');
      return;
    }

    if (setupAction === 'update') {
      setStatus('success');
      setMessage('GitHub App updated successfully!');
      return;
    }

    if (setupAction !== 'install') {
      setStatus('error');
      setMessage('Unknown installation action.');
      return;
    }

    // Wait for auth to load before proceeding
    if (authLoading) {
      return;
    }

    if (!isSignedIn) {
      setStatus('needs-auth');
      setMessage('Please sign in with GitHub to link your installation.');
      return;
    }

    // User is signed in, link the installation
    linkInstallationToUser(parseInt(installationId));
  }, [searchParams, isSignedIn, authLoading]);

  const linkInstallationToUser = async (installationId: number) => {
    try {
      setStatus('loading');
      setMessage('Linking GitHub App installation to your account...');

      const response = await fetch('/api/auth/link-installation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ installationId }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('GitHub App installed and linked successfully! You can now access private repositories.');
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to link installation. Please try again.');
      }
    } catch (error) {
      console.error('Failed to link installation:', error);
      setStatus('error');
      setMessage('Failed to link installation. Please try again.');
    }
  };

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error('Sign in failed:', error);
      setStatus('error');
      setMessage('Failed to sign in. Please try again.');
    }
  };

  const handleContinue = () => {
    router.push('/');
  };

  const handleRetry = () => {
    router.push('/install');
  };

  const handleRetryLinking = () => {
    const installationId = searchParams.get('installation_id');
    if (installationId) {
      linkInstallationToUser(parseInt(installationId));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && <Loader2 className="h-12 w-12 animate-spin text-blue-500" />}
            {status === 'success' && <CheckCircle className="h-12 w-12 text-green-500" />}
            {status === 'error' && <XCircle className="h-12 w-12 text-red-500" />}
            {status === 'needs-auth' && <AlertCircle className="h-12 w-12 text-yellow-500" />}
          </div>
          <CardTitle>
            {status === 'loading' && 'Installing GitHub App...'}
            {status === 'success' && 'Installation Complete!'}
            {status === 'error' && 'Installation Failed'}
            {status === 'needs-auth' && 'Sign In Required'}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {status === 'success' && (
            <Button onClick={handleContinue} className="w-full">
              Continue to GitHub.gg
            </Button>
          )}
          {status === 'needs-auth' && (
            <div className="space-y-2">
              <Button onClick={handleSignIn} className="w-full">
                Sign In with GitHub
              </Button>
              <Button onClick={handleContinue} variant="outline" className="w-full">
                Go Home
              </Button>
            </div>
          )}
          {status === 'error' && (
            <div className="space-y-2">
              <Button onClick={handleRetryLinking} variant="outline" className="w-full">
                Try Linking Again
              </Button>
              <Button onClick={handleRetry} variant="outline" className="w-full">
                Try Installation Again
              </Button>
              <Button onClick={handleContinue} className="w-full">
                Go Home
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 