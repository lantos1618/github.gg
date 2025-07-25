"use client";
import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { parseError } from '@/lib/types/errors';

interface MermaidRendererProps {
  code: string;
  onRenderError?: (error: string) => void;
  className?: string;
}

export function MermaidRenderer({ code, onRenderError, className = "" }: MermaidRendererProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    // Debug logging
    console.log('MermaidRenderer: Rendering diagram with code:', code?.substring(0, 100) + '...');

    // Generate a unique ID for this diagram
    const uniqueId = `mermaid-diagram-${Math.random().toString(36).substr(2, 9)}`;

    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
      });

      mermaid.render(uniqueId, code).then(({ svg }) => {
        console.log('MermaidRenderer: Successfully rendered diagram');
        if (ref.current) {
          ref.current.innerHTML = svg;
          if (onRenderError) onRenderError(''); // clear error
        }
      }).catch((err: unknown) => {
        console.error('MermaidRenderer: Error rendering diagram:', err);
        const errorMessage = parseError(err);
        if (ref.current) {
          ref.current.innerHTML = `<div class='text-red-600'>Invalid Mermaid diagram: ${errorMessage}</div>`;
        }
        if (onRenderError) onRenderError(errorMessage);
      });
    } catch (err: unknown) {
      console.error('MermaidRenderer: Error initializing mermaid:', err);
      const errorMessage = parseError(err);
      if (ref.current) {
        ref.current.innerHTML = `<div class='text-red-600'>Invalid Mermaid diagram: ${errorMessage}</div>`;
      }
      if (onRenderError) onRenderError(errorMessage);
    }
  }, [code, onRenderError]);

  return <div ref={ref} className={className} />;
} 