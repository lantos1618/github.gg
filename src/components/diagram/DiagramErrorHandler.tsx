"use client";
import { AnalysisErrorDisplay } from '@/components/ui/analysis-error-display';

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
      <AnalysisErrorDisplay
        error={error}
        isPending={isPending}
        onRetry={onRetry}
        onRetryWithContext={onRetryWithContext}
        hasPreviousResult={!!previousDiagramCode}
      />
      {previousDiagramCode && (
        <div className="mt-4 text-[12px] text-[#888] text-center italic">
          Previous diagram result is preserved below.
        </div>
      )}
    </div>
  );
}
