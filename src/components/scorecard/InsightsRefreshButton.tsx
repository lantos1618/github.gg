import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';

interface InsightsRefreshButtonProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  lastUpdated?: Date;
}

export function InsightsRefreshButton({ 
  onRefresh, 
  isRefreshing, 
  lastUpdated 
}: InsightsRefreshButtonProps) {
  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <div className="flex items-center space-x-3">
      {lastUpdated && (
        <div className="text-sm text-gray-500">
          Last updated: {formatLastUpdated(lastUpdated)}
        </div>
      )}
      <Button 
        onClick={onRefresh} 
        disabled={isRefreshing}
        variant="outline"
        size="sm"
      >
        {isRefreshing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Analysis
          </>
        )}
      </Button>
    </div>
  );
} 