"use client";
import { MermaidRenderer } from './MermaidRenderer';

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
      <div className="relative">
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