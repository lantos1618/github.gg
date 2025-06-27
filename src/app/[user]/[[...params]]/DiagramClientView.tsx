"use client";
import { useRepoData } from '@/lib/hooks/useRepoData';
import { useCopyRepoFiles } from '@/lib/hooks/useCopyRepoFiles';
import { RepoHeader } from '@/components/RepoHeader';
import RepoTabsBar from '@/components/RepoTabsBar';
import { useState, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';
import mermaid from 'mermaid';

const DIAGRAM_TYPES = [
  { value: 'flowchart', label: 'Flowchart' },
  { value: 'sequence', label: 'Sequence Diagram' },
  { value: 'class', label: 'Class Diagram' },
  { value: 'state', label: 'State Diagram' },
  { value: 'pie', label: 'Pie Chart' },
];

type DiagramType = 'flowchart'|'sequence'|'class'|'state'|'pie';

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

function DiagramClientView({ user, repo, refName, path }: { user: string; repo: string; refName?: string; path?: string }) {
    const { files, totalFiles } = useRepoData({ user, repo, ref: refName, path });
    const { copyAllContent, isCopying, copied } = useCopyRepoFiles(files);
    const [diagramType, setDiagramType] = useState<DiagramType>('flowchart');
    const [options] = useState({}); // placeholder for future options
    const [diagramCode, setDiagramCode] = useState('');
    const [error, setError] = useState<string|null>(null);
    const [lastInput, setLastInput] = useState<{diagramType: DiagramType; filesHash: string}|null>(null);
    const [manualRetryKey, setManualRetryKey] = useState(0);
    const [renderError, setRenderError] = useState<string>('');

    // Debounce files and diagramType to avoid double-firing
    const debouncedFiles = useDebouncedValue(files, 300);
    const debouncedDiagramType = useDebouncedValue(diagramType, 200);

    const generateDiagramMutation = trpc.diagram.generateDiagram.useMutation({
        onSuccess: (data) => {
            setDiagramCode(data.diagramCode);
            setError(null);
            setLastInput({diagramType: debouncedDiagramType, filesHash: JSON.stringify(debouncedFiles.map(f => f.path+f.content.length))});
        },
        onError: (err) => {
            setError(err.message || 'Failed to generate diagram');
            setDiagramCode('');
        }
    });

    // Only auto-generate if input changes and not errored
    useEffect(() => {
        if (!debouncedFiles || debouncedFiles.length === 0) return;
        const filesHash = JSON.stringify(debouncedFiles.map(f => f.path+f.content.length));
        const inputChanged = !lastInput || lastInput.diagramType !== debouncedDiagramType || lastInput.filesHash !== filesHash;
        if (inputChanged) {
            setError(null);
            setDiagramCode('');
            setLastInput(null); // reset so we can set it on success
            generateDiagramMutation.mutate({
                user,
                repo,
                ref: refName || 'main',
                files: debouncedFiles.map(f => ({ path: f.path, content: f.content, size: f.size })),
                diagramType: debouncedDiagramType,
                options,
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
        setDiagramCode('');
        setLastInput(null);
        setManualRetryKey(k => k + 1);
    };

    return (
        <>
            <RepoHeader
                user={user}
                repo={repo}
                onCopyAll={copyAllContent}
                isCopying={isCopying}
                copied={copied}
                fileCount={totalFiles}
            />
            <RepoTabsBar />
            <div className="max-w-screen-xl w-full mx-auto px-4 text-center mt-8">
                <h1>Diagram View</h1>
                <div className="mb-4 flex justify-center items-center gap-2">
                    <label htmlFor="diagram-type">Diagram Type:</label>
                    <select
                        id="diagram-type"
                        value={diagramType}
                        onChange={e => setDiagramType(e.target.value as DiagramType)}
                        className="border rounded px-2 py-1"
                    >
                        {DIAGRAM_TYPES.map(dt => (
                            <option key={dt.value} value={dt.value}>{dt.label}</option>
                        ))}
                    </select>
                </div>
                {generateDiagramMutation.isPending && <div className="my-8 text-lg">Generating diagram...</div>}
                {error && (
                    <div className="my-8">
                        <div className="text-red-600 mb-4">{error}</div>
                        <button 
                            onClick={handleRetry}
                            disabled={generateDiagramMutation.isPending}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                        >
                            {generateDiagramMutation.isPending ? 'Retrying...' : 'Retry'}
                        </button>
                    </div>
                )}
                {diagramCode && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                        <div>
                            <h2 className="font-bold mb-2">Mermaid Code</h2>
                            <pre className="bg-gray-100 p-4 rounded text-left overflow-x-auto text-xs md:text-sm">{diagramCode}</pre>
                        </div>
                        <div>
                            <h2 className="font-bold mb-2">Preview</h2>
                            <MermaidRenderer code={diagramCode} onRenderError={setRenderError} />
                            {renderError && (
                                <div className="mt-4 flex flex-col items-center">
                                    <div className="text-red-600 mb-2">Diagram failed to render. {renderError}</div>
                                    <button
                                        onClick={handleRetry}
                                        disabled={generateDiagramMutation.isPending}
                                        className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                                    >
                                        {generateDiagramMutation.isPending ? 'Regenerating...' : 'Regenerate (Fix)'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {!generateDiagramMutation.isPending && !diagramCode && !error && (
                    <p className="text-gray-500 mt-8">No diagram generated yet.</p>
                )}
            </div>
        </>
    );
}

export default DiagramClientView;
