"use client";
import { useState, useEffect } from 'react';
import RepoPageLayout from '@/components/layouts/RepoPageLayout';
import { DiagramType } from '@/lib/types/diagram';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useDiagramGeneration } from '@/lib/hooks/useDiagramGeneration';
import {
  DiagramTypeSelector,
  DiagramControls,
  DiagramCodePanel,
  DiagramPreview,
  DiagramErrorHandler,
} from '@/components/diagram';
import { LoadingWave } from '@/components/LoadingWave';

interface File {
  path: string;
  content: string;
  size: number;
}

function DiagramClientView({ 
  user, 
  repo, 
  refName, 
  path, 
  tab, 
  currentPath 
}: { 
  user: string; 
  repo: string; 
  refName?: string; 
  path?: string; 
  tab?: string; 
  currentPath?: string; 
}) {
  // State management
  const [diagramType, setDiagramType] = useState<DiagramType>('flowchart');
  const [options] = useState({});
  const [renderError, setRenderError] = useState<string>('');
  const [showCodePanel, setShowCodePanel] = useState(false);
  const [editableCode, setEditableCode] = useState('');
  const [lastCodePanelSize, setLastCodePanelSize] = useState(30);
  const [files, setFiles] = useState<File[]>([]);

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

  // Debounced values
  const debouncedFiles = useDebouncedValue(files, 300);
  const debouncedDiagramType = useDebouncedValue(diagramType, 200);

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
    files: debouncedFiles,
    diagramType: debouncedDiagramType,
    options,
  });

  // Display logic
  const displayDiagramCode = diagramCode || (error && previousDiagramCode ? previousDiagramCode : '');

  // Sync editableCode with diagramCode when diagramCode changes
  useEffect(() => {
    if (!showCodePanel) setEditableCode(displayDiagramCode);
  }, [displayDiagramCode, showCodePanel]);

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

  return (
    <RepoPageLayout user={user} repo={repo} refName={refName} path={path} tab={tab} currentPath={currentPath}>
      {({ files: repoFiles }) => {
        // Update files state when repoFiles changes
        if (repoFiles !== files) {
          setFiles(repoFiles);
        }

        return (
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
                    isPending={isPending}
                    renderError={renderError}
                    onRenderError={(err) => {
                      setRenderError(err);
                    }}
                    onRetryWithContext={handleRetryWithContext}
                  />
                </DiagramCodePanel>
              </div>
            )}

            {!isPending && !displayDiagramCode && !error && (
              <p className="text-gray-500 mt-8">No diagram generated yet.</p>
            )}
          </div>
        );
      }}
    </RepoPageLayout>
  );
}

export default DiagramClientView;
