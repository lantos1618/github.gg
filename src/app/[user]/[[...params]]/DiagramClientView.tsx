"use client";
import { useRepoData } from '@/lib/hooks/useRepoData';
import { useCopyRepoFiles } from '@/lib/hooks/useCopyRepoFiles';
import { RepoHeader } from '@/components/RepoHeader';
import RepoTabsBar from '@/components/RepoTabsBar';
import { LoadingWave } from '@/components/LoadingWave';
import { useState, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';
import mermaid from 'mermaid';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useRouter } from 'next/navigation';
import RepoPageLayout from '@/components/layouts/RepoPageLayout';
import { DiagramType, DIAGRAM_TYPES } from '@/lib/types/diagram';

function MermaidRenderer({ code, onRenderError }: { code: string, onRenderError?: (err: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!code || !ref.current) return;
    let isMounted = true;
    const id = `mermaid-diagram-${Math.random().toString(36).substr(2, 9)}`;
    mermaid.initialize({ startOnLoad: false });
    mermaid.parseError = (err) => {
      if (ref.current) ref.current.innerHTML = `<div class='text-red-600'>Invalid Mermaid diagram: ${err}</div>`;
      if (onRenderError) onRenderError(String(err));
    };
    try {
      mermaid.render(id, code).then(({ svg }) => {
        if (isMounted && ref.current) {
          ref.current.innerHTML = svg;
          if (onRenderError) onRenderError(''); // clear error
        }
      }).catch((err: any) => {
        if (ref.current) ref.current.innerHTML = `<div class='text-red-600'>Invalid Mermaid diagram: ${err?.message || err}</div>`;
        if (onRenderError) onRenderError(String(err?.message || err));
      });
    } catch (err: any) {
      if (ref.current) ref.current.innerHTML = `<div class='text-red-600'>Invalid Mermaid diagram: ${err?.message || err}</div>`;
      if (onRenderError) onRenderError(String(err?.message || err));
    }
    return () => { isMounted = false; };
  }, [code, onRenderError]);
  return <div ref={ref} className="w-full min-h-[200px] flex justify-center items-center bg-white rounded border p-2" />;
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

function DiagramClientView({ user, repo, refName, path, tab, currentPath }: { user: string; repo: string; refName?: string; path?: string; tab?: string; currentPath?: string }) {
    // Move all state and hooks that do NOT depend on files here
    const [diagramType, setDiagramType] = useState<DiagramType>('flowchart');
    const [options] = useState({}); // placeholder for future options
    const [diagramCode, setDiagramCode] = useState('');
    const [error, setError] = useState<string|null>(null);
    const [lastInput, setLastInput] = useState<{diagramType: DiagramType; filesHash: string}|null>(null);
    const [manualRetryKey, setManualRetryKey] = useState(0);
    const [renderError, setRenderError] = useState<string>('');
    const [previousDiagramCode, setPreviousDiagramCode] = useState<string>(''); // Store previous result for retry
    const [lastError, setLastError] = useState<string>(''); // Store last error for context
    const [showCodePanel, setShowCodePanel] = useState(false); // Toggle for code panel
    const [editableCode, setEditableCode] = useState('');
    // State for last code panel size
    const [lastCodePanelSize, setLastCodePanelSize] = useState(30);
    const router = useRouter();

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

    return (
        <RepoPageLayout user={user} repo={repo} refName={refName} path={path} tab={tab} currentPath={currentPath}>
            {({ files, totalFiles }) => {
                // All hooks and logic that depend on files go here
                const debouncedFiles = useDebouncedValue(files, 300);
                const debouncedDiagramType = useDebouncedValue(diagramType, 200);

                const generateDiagramMutation = trpc.diagram.generateDiagram.useMutation({
                    onSuccess: (data) => {
                        setDiagramCode(data.diagramCode);
                        setError(null);
                        setLastError(''); // Clear error on success
                        setLastInput({
                            diagramType: debouncedDiagramType, 
                            filesHash: JSON.stringify(debouncedFiles.map(f => f.path+f.content.length))
                        });
                    },
                    onError: (err) => {
                        const errorMessage = err.message || 'Failed to generate diagram';
                        setError(errorMessage);
                        setLastError(errorMessage); // Store error for retry context
                        // Don't clear diagramCode on error - preserve previous result
                    }
                });

                // Only auto-generate if input changes and not errored
                useEffect(() => {
                    if (!debouncedFiles || debouncedFiles.length === 0) return;
                    const filesHash = JSON.stringify(debouncedFiles.map(f => f.path+f.content.length));
                    const inputChanged = !lastInput || lastInput.diagramType !== debouncedDiagramType || lastInput.filesHash !== filesHash;
                    if (inputChanged) {
                        setError(null);
                        setLastError('');
                        // Store current diagram code before clearing (for potential retry)
                        if (diagramCode) {
                            setPreviousDiagramCode(diagramCode);
                        }
                        setDiagramCode('');
                        setLastInput(null); // reset so we can set it on success
                        generateDiagramMutation.mutate({
                            user,
                            repo,
                            ref: refName || 'main',
                            files: debouncedFiles.map(f => ({ path: f.path, content: f.content, size: f.size })),
                            diagramType: debouncedDiagramType,
                            options,
                            // Pass retry context if this is a retry
                            ...(manualRetryKey > 0 && {
                                previousResult: previousDiagramCode,
                                lastError: lastError,
                                isRetry: true,
                            }),
                        });
                    }
                    // eslint-disable-next-line react-hooks/exhaustive-deps
                }, [debouncedFiles, debouncedDiagramType, manualRetryKey]);

                // Block auto-generation after error until user retries or changes input
                useEffect(() => {
                    if (!error) return;
                    // If error, do nothing. Only retry on handleRetry or input change.
                }, [error]);

                const handleRetry = () => {
                    setError(null);
                    // Don't clear diagramCode - preserve the previous result
                    setLastInput(null);
                    setManualRetryKey(k => k + 1);
                };

                const handleRetryWithContext = () => {
                    if (!previousDiagramCode || !lastError) return;
                    
                    setError(null);
                    generateDiagramMutation.mutate({
                        user,
                        repo,
                        ref: refName || 'main',
                        files: debouncedFiles.map(f => ({ path: f.path, content: f.content, size: f.size })),
                        diagramType: debouncedDiagramType,
                        options,
                        previousResult: previousDiagramCode,
                        lastError: lastError,
                        isRetry: true,
                    });
                };

                // Show previous result if available and current generation failed
                const displayDiagramCode = diagramCode || (error && previousDiagramCode ? previousDiagramCode : '');

                // Sync editableCode with diagramCode when diagramCode changes (but not when user is editing)
                useEffect(() => {
                    if (!showCodePanel) setEditableCode(displayDiagramCode);
                }, [displayDiagramCode, showCodePanel]);

                // Copy handlers
                const handleCopyMermaid = () => {
                    navigator.clipboard.writeText(editableCode || displayDiagramCode);
                };
                const handleCopyDiagram = () => {
                    // Try to copy the SVG from the MermaidRenderer
                    const svg = document.querySelector('.mermaid svg');
                    if (svg) {
                        const serializer = new XMLSerializer();
                        const svgString = serializer.serializeToString(svg);
                        navigator.clipboard.writeText(svgString);
                    }
                };

                // When code is edited, update the preview live
                const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
                    setEditableCode(e.target.value);
                    setDiagramCode(e.target.value);
                };

                // When toggling code panel, set showCodePanel and remember last size
                const handleToggleCodePanel = () => {
                    setShowCodePanel((prev) => !prev);
                };

                return (
                    <div className="w-full px-0 text-center mt-8">
                        <h1>Diagram View</h1>
                        <div className="mb-4 flex justify-center items-center gap-2">
                            <span className="mr-2 font-medium">Diagram Type:</span>
                            <div className="flex gap-2">
                                {DIAGRAM_TYPES.map(dt => (
                                    <button
                                        key={dt.value}
                                        onClick={() => setDiagramType(dt.value as DiagramType)}
                                        className={`px-4 py-1 rounded border transition-colors duration-150 font-medium
                                            ${diagramType === dt.value
                                                ? 'bg-blue-600 text-white border-blue-700 shadow'
                                                : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'}
                                        `}
                                        disabled={diagramType === dt.value}
                                        type="button"
                                    >
                                        {dt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {generateDiagramMutation.isPending && (
                            <div className="my-8 flex flex-col items-center gap-4">
                                <LoadingWave size="lg" color="#3b82f6" />
                                <div className="text-lg text-blue-700 font-medium">Generating diagram...</div>
                            </div>
                        )}
                        {error && (
                            <div className="my-8">
                                <div className="text-red-600 mb-4">{error}</div>
                                <div className="flex gap-2 justify-center">
                                    <button 
                                        onClick={handleRetry}
                                        disabled={generateDiagramMutation.isPending}
                                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                                    >
                                        {generateDiagramMutation.isPending ? 'Retrying...' : 'Retry'}
                                    </button>
                                    {previousDiagramCode && (
                                        <button 
                                            onClick={handleRetryWithContext}
                                            disabled={generateDiagramMutation.isPending}
                                            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                                        >
                                            {generateDiagramMutation.isPending ? 'Retrying with Context...' : 'Retry with Previous Result'}
                                        </button>
                                    )}
                                </div>
                                {previousDiagramCode && (
                                    <div className="mt-4 text-sm text-gray-600">
                                        Previous diagram result is preserved below. You can retry generation or continue using the previous result.
                                    </div>
                                )}
                            </div>
                        )}
                        {displayDiagramCode && (
                            <div className="w-full bg-white border rounded-lg shadow overflow-hidden" style={{minHeight: 500}}>
                                {/* Header with controls */}
                                <div className="flex items-center gap-2 p-4 border-b bg-gray-50 justify-start">
                                    <button
                                        onClick={handleToggleCodePanel}
                                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2"
                                    >
                                        {showCodePanel ? (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                Hide Code
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                                </svg>
                                                Show Code
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleCopyMermaid}
                                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                                    >Copy Mermaid</button>
                                    <button
                                        onClick={handleCopyDiagram}
                                        className="bg-green-100 hover:bg-green-200 text-green-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                                    >Copy Diagram</button>
                                </div>
                                {/* Resizable panels: code and preview */}
                                {showCodePanel ? (
                                  <ResizablePanelGroup direction="horizontal">
                                    <ResizablePanel minSize={10} maxSize={60} defaultSize={lastCodePanelSize} onResize={setLastCodePanelSize} className="bg-gray-50 border-r">
                                      <div className="flex-1 flex flex-col p-4 h-full">
                                        <h2 className="font-bold mb-2 text-left">Mermaid Code</h2>
                                        <textarea
                                          className="bg-white p-4 rounded border text-left overflow-x-auto text-xs md:text-sm font-mono w-full h-full min-h-[300px] resize-vertical"
                                          value={editableCode}
                                          onChange={handleCodeChange}
                                          spellCheck={false}
                                          disabled={generateDiagramMutation.isPending}
                                          style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}
                                          wrap="soft"
                                        />
                                      </div>
                                    </ResizablePanel>
                                    <ResizableHandle withHandle />
                                    <ResizablePanel minSize={30} defaultSize={100 - lastCodePanelSize} className="bg-white">
                                      <div className="flex flex-col p-4 h-full">
                                        <h2 className="font-bold mb-2 text-left">Preview</h2>
                                        <div className="relative">
                                          <MermaidRenderer code={editableCode || displayDiagramCode} onRenderError={(err) => {
                                            setRenderError(err);
                                            if (err && !lastError) {
                                              setLastError(`Render error: ${err}`);
                                            }
                                          }} />
                                          {(generateDiagramMutation.isPending) && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10">
                                              <div className="flex flex-col items-center gap-2">
                                                <LoadingWave />
                                                <span className="text-blue-700 font-medium">Generating diagram...</span>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                        {renderError && (
                                          <div className="mt-4 flex flex-col items-center">
                                            <div className="text-red-600 mb-2">Diagram failed to render. {renderError}</div>
                                            <button
                                              onClick={handleRetryWithContext}
                                              disabled={generateDiagramMutation.isPending}
                                              className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                                            >
                                              Regenerate (Fix)
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </ResizablePanel>
                                  </ResizablePanelGroup>
                                ) : (
                                  <div className="bg-white w-full">
                                    <div className="flex flex-col p-4 h-full">
                                      <h2 className="font-bold mb-2 text-left">Preview</h2>
                                      <div className="relative">
                                        <MermaidRenderer code={editableCode || displayDiagramCode} onRenderError={(err) => {
                                          setRenderError(err);
                                          if (err && !lastError) {
                                            setLastError(`Render error: ${err}`);
                                          }
                                        }} />
                                        {(generateDiagramMutation.isPending) && (
                                          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10">
                                            <div className="flex flex-col items-center gap-2">
                                              <LoadingWave />
                                              <span className="text-blue-700 font-medium">Generating diagram...</span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      {renderError && (
                                        <div className="mt-4 flex flex-col items-center">
                                          <div className="text-red-600 mb-2">Diagram failed to render. {renderError}</div>
                                          <button
                                            onClick={handleRetryWithContext}
                                            disabled={generateDiagramMutation.isPending}
                                            className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                                          >
                                            Regenerate (Fix)
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                        )}
                        {!generateDiagramMutation.isPending && !displayDiagramCode && !error && (
                            <p className="text-gray-500 mt-8">No diagram generated yet.</p>
                        )}
                    </div>
                );
            }}
        </RepoPageLayout>
    );
}

export default DiagramClientView;
