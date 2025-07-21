"use client";
import React, { useState, useEffect, useMemo } from 'react';
import RepoPageLayout from '@/components/layouts/RepoPageLayout';
import { DiagramType } from '@/lib/types/diagram';

import { useDiagramGeneration } from '@/lib/hooks/useDiagramGeneration';
import { useRepoData } from '@/lib/hooks/useRepoData';
import {
  DiagramTypeSelector,
  DiagramControls,
  DiagramCodePanel,
  DiagramPreview,
  DiagramErrorHandler,
} from '@/components/diagram';
import { LoadingWave } from '@/components/LoadingWave';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import { trpc } from '@/lib/trpc/client';

function DiagramClientView({ 
  user, 
  repo, 
  refName, 
  path
}: { 
  user: string; 
  repo: string; 
  refName?: string; 
  path?: string; 
}) {
  // State management
  const [diagramType, setDiagramType] = useState<DiagramType>('flowchart');
  const [options] = useState({});
  const [renderError, setRenderError] = useState<string>('');
  const [showCodePanel, setShowCodePanel] = useState(false);
  const [editableCode, setEditableCode] = useState('');
  const [lastCodePanelSize, setLastCodePanelSize] = useState(30);

  // Get repo data
  const { files: repoFiles, isLoading: filesLoading, error: filesError, totalFiles } = useRepoData({ user, repo, ref: refName, path });

  // Check user plan
  const { data: currentPlan, isLoading: planLoading } = trpc.user.getCurrentPlan.useQuery();

  // Use the new public endpoint for cached diagram
  const { data: publicDiagram, isLoading: publicLoading } = trpc.diagram.publicGetDiagram.useQuery({
    user,
    repo,
    ref: refName || 'main',
    diagramType,
  }, { enabled: !!user && !!repo && !!diagramType });

  // Keyboard shortcut to close code panel
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showCodePanel) {
        setShowCodePanel(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showCodePanel]);

  // Debounced values - removed unused variables

  // Memoize all inputs to useDiagramGeneration to prevent repeated requests
  const stableFiles = useMemo(() => repoFiles, [repoFiles]);
  const stableOptions = useMemo(() => options, [options]);
  const stableDiagramType = useMemo(() => diagramType, [diagramType]);

  // Debug log to see what is changing
  console.log('diagram generation inputs', { user, repo, refName, files: stableFiles, diagramType: stableDiagramType, options: stableOptions });

  // Diagram generation logic
  const {
    diagramCode,
    error,
    isPending,
    previousDiagramCode,
    handleRetry,
    handleRetryWithContext,
  } = useDiagramGeneration({
    user,
    repo,
    refName,
    files: stableFiles,
    diagramType: stableDiagramType,
    options: stableOptions,
  });

  // Display logic
  const displayDiagramCode = diagramCode || (error && previousDiagramCode ? previousDiagramCode : '');

  // Sync editableCode with diagramCode when diagramCode changes
  useEffect(() => {
    if (!showCodePanel && editableCode !== displayDiagramCode) {
      setEditableCode(displayDiagramCode);
    }
  }, [displayDiagramCode, showCodePanel, editableCode]);

  // Copy handlers
  const handleCopyMermaid = () => {
    navigator.clipboard.writeText(editableCode || displayDiagramCode);
  };

  const handleCopyDiagram = () => {
    const svg = document.querySelector('.mermaid svg');
    if (svg) {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg);
      navigator.clipboard.writeText(svgString);
    }
  };

  // Code change handler
  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditableCode(e.target.value);
  };

  // Panel toggle handler
  const handleToggleCodePanel = () => {
    setShowCodePanel((prev) => !prev);
  };

  // Check if user has access to AI features
  const hasAccess = currentPlan?.plan === 'byok' || currentPlan?.plan === 'pro';

  // If a cached diagram is available, show it and skip all AI/generation logic
  if (publicDiagram?.diagramCode) {
    return (
      <RepoPageLayout user={user} repo={repo} refName={refName} files={repoFiles} totalFiles={totalFiles}>
        <div className="w-full px-0 text-center mt-8">
          <h1>Diagram View</h1>
          <DiagramTypeSelector
            diagramType={diagramType}
            onDiagramTypeChange={setDiagramType}
            disabled={publicLoading}
          />
          <div className="w-full bg-white border rounded-lg shadow overflow-hidden mt-8" style={{minHeight: 500}}>
            <DiagramCodePanel
              showCodePanel={showCodePanel}
              editableCode={publicDiagram.diagramCode}
              onCodeChange={handleCodeChange}
              lastCodePanelSize={lastCodePanelSize}
              onCodePanelSizeChange={setLastCodePanelSize}
              disabled={publicLoading}
            >
              <DiagramPreview
                code={publicDiagram.diagramCode}
                renderError={renderError}
                onRenderError={setRenderError}
              />
            </DiagramCodePanel>
          </div>
        </div>
      </RepoPageLayout>
    );
  }

  // Show loading state while files are loading
  if (filesLoading || publicLoading || planLoading) {
    return (
      <RepoPageLayout user={user} repo={repo} refName={refName} files={repoFiles} totalFiles={totalFiles}>
        <div className="w-full px-4 py-8">
          <div className="flex flex-col items-center gap-4">
            <LoadingWave size="lg" color="#3b82f6" />
            <div className="text-lg text-blue-700 font-medium">Loading repository files...</div>
          </div>
        </div>
      </RepoPageLayout>
    );
  }

  // Show error state if files failed to load
  if (filesError) {
    return (
      <RepoPageLayout user={user} repo={repo} refName={refName} files={repoFiles} totalFiles={totalFiles}>
        <div className="w-full px-4 py-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Files Loading Failed</h2>
            <p className="text-gray-600">Unable to load repository files.</p>
            <p className="text-sm text-gray-500 mt-2">{String(filesError)}</p>
          </div>
        </div>
      </RepoPageLayout>
    );
  }

  return (
    <RepoPageLayout user={user} repo={repo} refName={refName} files={repoFiles} totalFiles={totalFiles}>
      <div className="w-full px-0 text-center mt-8">
        <h1>Diagram View</h1>
        
        <DiagramTypeSelector
          diagramType={diagramType}
          onDiagramTypeChange={setDiagramType}
          disabled={isPending}
        />

        {isPending && (
          <div className="my-8 flex flex-col items-center gap-4">
            <LoadingWave size="lg" color="#3b82f6" />
            <div className="text-lg text-blue-700 font-medium">Generating diagram...</div>
          </div>
        )}

        <DiagramErrorHandler
          error={error}
          isPending={isPending}
          previousDiagramCode={previousDiagramCode}
          onRetry={handleRetry}
          onRetryWithContext={handleRetryWithContext}
        />

        {displayDiagramCode && (
          <div className="w-full bg-white border rounded-lg shadow overflow-hidden" style={{minHeight: 500}}>
            <DiagramControls
              showCodePanel={showCodePanel}
              onToggleCodePanel={handleToggleCodePanel}
              onCopyMermaid={handleCopyMermaid}
              onCopyDiagram={handleCopyDiagram}
              onRegenerate={handleRetryWithContext}
              renderError={renderError}
              disabled={isPending}
            />

            <DiagramCodePanel
              showCodePanel={showCodePanel}
              editableCode={editableCode}
              onCodeChange={handleCodeChange}
              lastCodePanelSize={lastCodePanelSize}
              onCodePanelSizeChange={setLastCodePanelSize}
              disabled={isPending}
            >
              <DiagramPreview
                code={editableCode || displayDiagramCode}
                renderError={renderError}
                onRenderError={(err) => {
                  setRenderError(err);
                }}
              />
            </DiagramCodePanel>
          </div>
        )}

        {!isPending && !displayDiagramCode && !error && (
          <p className="text-gray-500 mt-8">No diagram generated yet.</p>
        )}

        {/* Show upgrade prompt if user doesn't have access */}
        {!hasAccess && (
          <div className="mt-8">
            <UpgradePrompt feature="diagram" />
          </div>
        )}

        {/* Branch selector now local to this view */}
        {/* BranchSelector removed per user request */}
      </div>
    </RepoPageLayout>
  );
}

export default DiagramClientView;
