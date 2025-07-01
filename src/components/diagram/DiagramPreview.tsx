"use client";
import { MermaidRenderer } from './MermaidRenderer';
import { LoadingWave } from '@/components/LoadingWave';

interface DiagramPreviewProps {
  code: string;
  isPending: boolean;
  renderError: string;
  onRenderError: (err: string) => void;
}

export function DiagramPreview({
  code,
  isPending,
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