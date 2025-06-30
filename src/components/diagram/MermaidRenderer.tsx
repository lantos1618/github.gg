"use client";
import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { parseError } from '../../lib/types/errors';

interface MermaidRendererProps {
  code: string;
  onRenderError?: (error: string) => void;
  className?: string;
}

export function MermaidRenderer({ code, onRenderError, className = "" }: MermaidRendererProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
      });

      mermaid.render('mermaid-diagram', code).then(({ svg }) => {
        if (ref.current) {
          ref.current.innerHTML = svg;
          if (onRenderError) onRenderError(''); // clear error
        }
      }).catch((err: unknown) => {
        const errorMessage = parseError(err);
        if (ref.current) {
          ref.current.innerHTML = `<div class='text-red-600'>Invalid Mermaid diagram: ${errorMessage}</div>`;
        }
        if (onRenderError) onRenderError(errorMessage);
      });
    } catch (err: unknown) {
      const errorMessage = parseError(err);
      if (ref.current) {
        ref.current.innerHTML = `<div class='text-red-600'>Invalid Mermaid diagram: ${errorMessage}</div>`;
      }
      if (onRenderError) onRenderError(errorMessage);
    }
  }, [code, onRenderError]);

  return <div ref={ref} className={className} />;
} 