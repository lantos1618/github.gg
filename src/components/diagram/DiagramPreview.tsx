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
        {isPending && (
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
        </div>
      )}
    </>
  );
} 