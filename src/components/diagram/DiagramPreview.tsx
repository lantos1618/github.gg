"use client";
import dynamic from 'next/dynamic';
// Lazy load MermaidRenderer - mermaid is ~200KB, only load when needed
const MermaidRenderer = dynamic(
  () => import('./MermaidRenderer').then(mod => ({ default: mod.MermaidRenderer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[200px] border rounded-lg bg-muted/20">
        <p className="text-base text-[#aaa]">Loading...</p>
      </div>
    ),
  }
);

interface DiagramPreviewProps {
  code: string;
  renderError: string;
  onRenderError: (err: string) => void;
}

export function DiagramPreview({
  code,
  renderError,
  onRenderError
}: DiagramPreviewProps) {
  return (
    <>
      <h2 className="font-bold mb-2 text-left">Preview</h2>
      <div data-testid="diagram-container" className="relative">
        <MermaidRenderer
          code={code}
          onRenderError={onRenderError}
        />
      </div>
      {renderError && (
        <div className="mt-4 flex flex-col items-center">
          <div className="text-red-600 mb-2">Diagram failed to render. {renderError}</div>
        </div>
      )}
    </>
  );
}
