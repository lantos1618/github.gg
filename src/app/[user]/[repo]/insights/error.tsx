'use client';

import { RepoLayout } from '@/components/RepoLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function InsightsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RepoLayout>
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Analysis Failed</h2>
            <p className="text-gray-600 mb-4">
              {error.message || 'Something went wrong while analyzing the repository.'}
            </p>
            <Button onClick={reset} className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </RepoLayout>
  );
} 