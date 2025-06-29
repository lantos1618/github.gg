"use client";
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';

interface DiagramErrorHandlerProps {
  error: string | null;
  isPending: boolean;
  previousDiagramCode: string;
  onRetry: () => void;
  onRetryWithContext: () => void;
}

export function DiagramErrorHandler({
  error,
  isPending,
  previousDiagramCode,
  onRetry,
  onRetryWithContext
}: DiagramErrorHandlerProps) {
  if (!error) return null;

  return (
    <div className="my-8">
      <ErrorDisplay
        error={error}
        isPending={isPending}
        onRetry={onRetry}
        onRetryWithContext={onRetryWithContext}
        hasPreviousResult={!!previousDiagramCode}
      />
      {previousDiagramCode && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          Previous diagram result is preserved below. You can retry generation or continue using the previous result.
        </div>
      )}
    </div>
  );
} 