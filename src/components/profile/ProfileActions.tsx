import { Button } from '@/components/ui/button';
import { RefreshCw, Settings } from 'lucide-react';

interface ProfileActionsProps {
  isOwnProfile: boolean;
  isGenerating: boolean;
  reposLoading: boolean;
  canRefresh: boolean;
  onConfigure: () => void;
  onRefresh: () => void;
}

export function ProfileActions({
  isOwnProfile,
  isGenerating,
  reposLoading,
  canRefresh,
  onConfigure,
  onRefresh,
}: ProfileActionsProps) {
  return (
    <div className="flex items-center gap-1">

      {isOwnProfile && (
        <Button
          data-testid="profile-action-configure-btn"
          onClick={onConfigure}
          disabled={isGenerating || reposLoading}
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[#aaa] hover:text-[#111]"
          title="Configure repositories"
        >
          <Settings className="h-4 w-4" />
        </Button>
      )}

      {canRefresh && (
        <Button
          data-testid="profile-refresh-btn"
          onClick={onRefresh}
          disabled={isGenerating}
          variant="ghost"
          size="icon"
          className={`h-8 w-8 text-[#aaa] hover:text-[#111] ${isGenerating ? 'animate-pulse' : ''}`}
          title="Refresh analysis"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
