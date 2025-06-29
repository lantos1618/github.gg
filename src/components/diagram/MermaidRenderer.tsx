"use client";
import { useRef, useEffect } from 'react';
import mermaid from 'mermaid';

interface MermaidRendererProps {
  code: string;
  onRenderError?: (err: string) => void;
  className?: string;
}

export function MermaidRenderer({ code, onRenderError, className = "" }: MermaidRendererProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!code || !ref.current) return;
    
    let isMounted = true;
    const id = `mermaid-diagram-${Math.random().toString(36).substr(2, 9)}`;
    
    mermaid.initialize({ startOnLoad: false });
    mermaid.parseError = (err) => {
      if (ref.current) {
        ref.current.innerHTML = `<div class='text-red-600'>Invalid Mermaid diagram: ${err}</div>`;
      }
      if (onRenderError) onRenderError(String(err));
    };

    try {
      mermaid.render(id, code).then(({ svg }) => {
        if (isMounted && ref.current) {
          ref.current.innerHTML = svg;
          if (onRenderError) onRenderError(''); // clear error
        }
      }).catch((err: Error | unknown) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (ref.current) {
          ref.current.innerHTML = `<div class='text-red-600'>Invalid Mermaid diagram: ${errorMessage}</div>`;
        }
        if (onRenderError) onRenderError(errorMessage);
      });
    } catch (err: Error | unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (ref.current) {
        ref.current.innerHTML = `<div class='text-red-600'>Invalid Mermaid diagram: ${errorMessage}</div>`;
      }
      if (onRenderError) onRenderError(errorMessage);
    }

    return () => { isMounted = false; };
  }, [code, onRenderError]);

  return (
    <div 
      ref={ref} 
      className={`w-full min-h-[200px] flex justify-center items-center bg-white rounded border p-2 ${className}`} 
    />
  );
} 