import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface InsightsRefreshButtonProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  lastUpdated?: Date;
}

export function InsightsRefreshButton({ onRefresh, isRefreshing, lastUpdated }: InsightsRefreshButtonProps) {
  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  return (
    <div className="flex items-center gap-3">
      {lastUpdated && (
        <span className="text-[13px] text-[#aaa]">Updated {formatLastUpdated(lastUpdated)}</span>
      )}
      <Button
        onClick={onRefresh}
        disabled={isRefreshing}
        variant="outline"
        size="sm"
        data-testid="scorecard-refresh-btn"
        className={`border-[#ddd] text-base hover:border-[#111] ${isRefreshing ? 'animate-pulse' : ''}`}
      >
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
        Refresh
      </Button>
    </div>
  );
}
