'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function InstallCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing installation...');

  useEffect(() => {
    const installationId = searchParams.get('installation_id');
    const setupAction = searchParams.get('setup_action');

    if (installationId) {
      if (setupAction === 'install') {
        setStatus('success');
        setMessage('GitHub App installed successfully! You can now analyze private repositories.');
      } else if (setupAction === 'update') {
        setStatus('success');
        setMessage('GitHub App updated successfully!');
      } else {
        setStatus('error');
        setMessage('Unknown installation action.');
      }
    } else {
      setStatus('error');
      setMessage('No installation ID found.');
    }
  }, [searchParams]);

  const handleContinue = () => {
    router.push('/');
  };

  const handleRetry = () => {
    router.push('/install');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && <Loader2 className="h-12 w-12 animate-spin text-blue-500" />}
            {status === 'success' && <CheckCircle className="h-12 w-12 text-green-500" />}
            {status === 'error' && <XCircle className="h-12 w-12 text-red-500" />}
          </div>
          <CardTitle>
            {status === 'loading' && 'Installing GitHub App...'}
            {status === 'success' && 'Installation Complete!'}
            {status === 'error' && 'Installation Failed'}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {status === 'success' && (
            <Button onClick={handleContinue} className="w-full">
              Continue to GitHub.gg
            </Button>
          )}
          {status === 'error' && (
            <div className="space-y-2">
              <Button onClick={handleRetry} variant="outline" className="w-full">
                Try Again
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