import { Button } from '@/components/ui/button';
import { RefreshCw, Sword, FolderGit2 } from 'lucide-react';

interface ProfileActionsProps {
  isOwnProfile: boolean;
  isGenerating: boolean;
  reposLoading: boolean;
  showChallengeButton: boolean;
  canRefresh: boolean;
  onChallenge: () => void;
  onConfigure: () => void;
  onRefresh: () => void;
}

export function ProfileActions({
  isOwnProfile,
  isGenerating,
  reposLoading,
  showChallengeButton,
  canRefresh,
  onChallenge,
  onConfigure,
  onRefresh,
}: ProfileActionsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {showChallengeButton && (
        <Button
          onClick={onChallenge}
          variant="outline"
          className="h-12 px-6 border-gray-200 hover:border-black transition-colors"
        >
          <Sword className="h-4 w-4 mr-2" />
          Challenge
        </Button>
      )}
      
      {isOwnProfile && (
        <Button
          onClick={onConfigure}
          disabled={isGenerating || reposLoading}
          variant="outline"
          className="h-12 px-6 border-gray-200 hover:border-black transition-colors"
        >
          <FolderGit2 className="h-4 w-4 mr-2" />
          Configure
        </Button>
      )}

      {canRefresh && (
        <Button
          onClick={onRefresh}
          disabled={isGenerating}
          className="h-12 px-6 bg-black hover:bg-gray-800 text-white shadow-none rounded-lg"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Analyzing...' : 'Refresh Analysis'}
        </Button>
      )}
    </div>
  );
}
