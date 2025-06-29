"use client";
import { getErrorDisplayConfig } from '@/lib/utils/errorHandling';

interface ErrorDisplayProps {
  error: string | null;
  isPending?: boolean;
  onRetry?: () => void;
  onRetryWithContext?: () => void;
  hasPreviousResult?: boolean;
  className?: string;
}

export function ErrorDisplay({
  error,
  isPending = false,
  onRetry,
  onRetryWithContext,
  hasPreviousResult = false,
  className = ""
}: ErrorDisplayProps) {
  if (!error) return null;

  const config = getErrorDisplayConfig(error);

  return (
    <div className={`text-center py-8 ${className}`}>
      <div className="max-w-md mx-auto">
        <div className="text-6xl mb-4">{config.icon}</div>
        <h2 className={`text-xl font-semibold mb-2 ${config.titleColor}`}>
          {config.title}
        </h2>
        <p className="text-gray-600 mb-4">{config.description}</p>
        
        <div className={`${config.bgColor} border ${config.borderColor} rounded-lg p-4 mb-4`}>
          <p className={`text-sm ${config.textColor}`}>
            <strong>What happened?</strong> {config.explanation}
          </p>
        </div>

        {(onRetry || onRetryWithContext) && (
          <div className="flex gap-2 justify-center">
            {onRetry && (
              <button
                onClick={onRetry}
                disabled={isPending}
                className={`${config.buttonColor} text-white font-bold py-2 px-4 rounded disabled:opacity-50`}
              >
                {isPending ? 'Retrying...' : 'Try Again'}
              </button>
            )}
            
            {onRetryWithContext && hasPreviousResult && (
              <button
                onClick={onRetryWithContext}
                disabled={isPending}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                {isPending ? 'Retrying with Context...' : 'Retry with Previous Result'}
              </button>
            )}
          </div>
        )}

        {config.isRateLimit && (
          <p className="text-xs text-gray-500 mt-3">
            Limits reset periodically. You can also try again later.
          </p>
        )}
      </div>
    </div>
  );
} 