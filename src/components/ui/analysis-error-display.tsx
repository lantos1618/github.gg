"use client";
import { getErrorDisplayConfig } from '@/lib/utils/errorHandling';
import { UpgradePrompt } from '@/components/upgrade';

interface AnalysisErrorDisplayProps {
  error: string | null;
  isPending?: boolean;
  onRetry?: () => void;
  onRetryWithContext?: () => void;
  hasPreviousResult?: boolean;
  className?: string;
}

export function AnalysisErrorDisplay({
  error,
  isPending = false,
  onRetry,
  onRetryWithContext,
  hasPreviousResult = false,
  className = ""
}: AnalysisErrorDisplayProps) {
  if (!error) return null;

  const config = getErrorDisplayConfig(error);

  if (config.isSubscription) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="max-w-md mx-auto mb-8">
          <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
            Subscription Required
          </div>
          <h2 className="text-[20px] font-semibold text-[#111] mb-2">{config.title}</h2>
          <p className="text-base text-[#666] mb-4">{config.description}</p>
          <div className="bg-[#f8f9fa] py-[14px] px-[16px] text-left" style={{ borderLeft: '3px solid #f59e0b' }}>
            <div className="text-[13px] font-semibold uppercase tracking-[1px] text-[#f59e0b] mb-1">Details</div>
            <div className="text-base text-[#333] leading-[1.6]">{config.explanation}</div>
          </div>
        </div>
        <UpgradePrompt />
      </div>
    );
  }

  const color = config.isRateLimit ? '#f59e0b' : '#ea4335';

  return (
    <div className={`text-center py-8 ${className}`}>
      <div className="max-w-md mx-auto">
        <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">Error</div>
        <h2 className="text-[20px] font-semibold text-[#111] mb-2">{config.title}</h2>
        <p className="text-base text-[#666] mb-4">{config.description}</p>

        <div className="bg-[#f8f9fa] py-[14px] px-[16px] text-left mb-6" style={{ borderLeft: `3px solid ${color}` }}>
          <div className="text-[13px] font-semibold uppercase tracking-[1px] mb-1" style={{ color }}>What happened</div>
          <div className="text-base text-[#333] leading-[1.6]">{config.explanation}</div>
          {error && error !== config.explanation && (
            <div className="mt-3 pt-3 border-t border-[#e5e5e5]">
              <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[#888] mb-1">Server message</div>
              <div className="text-[13px] text-[#555] font-mono break-all whitespace-pre-wrap">{error}</div>
            </div>
          )}
        </div>

        {(onRetry || onRetryWithContext) && (
          <div className="flex gap-2 justify-center">
            {onRetry && (
              <button
                onClick={onRetry}
                disabled={isPending}
                className="px-4 py-2 bg-[#111] text-white text-base font-medium rounded-md hover:bg-[#333] transition-colors disabled:opacity-50"
              >
                {isPending ? 'Retrying...' : 'Try Again'}
              </button>
            )}
            {onRetryWithContext && hasPreviousResult && (
              <button
                onClick={onRetryWithContext}
                disabled={isPending}
                className="px-4 py-2 bg-[#f8f9fa] text-[#333] text-base font-medium rounded-md border border-[#ddd] hover:border-[#aaa] transition-colors disabled:opacity-50"
              >
                {isPending ? 'Retrying...' : 'Retry with Previous'}
              </button>
            )}
          </div>
        )}

        {config.isRateLimit && (
          <p className="text-[13px] text-[#aaa] mt-3">Limits reset periodically. Try again later.</p>
        )}
      </div>
    </div>
  );
}
