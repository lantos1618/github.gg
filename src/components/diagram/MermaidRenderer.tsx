"use client";
import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { parseError } from '@/lib/types/errors';

// Initialize once at module level — calling inside useEffect resets global state
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'strict',
});

interface MermaidRendererProps {
  code: string;
  onRenderError?: (error: string) => void;
  className?: string;
}

export function MermaidRenderer({ code, onRenderError, className = "" }: MermaidRendererProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const uniqueId = `mermaid-diagram-${Math.random().toString(36).substr(2, 9)}`;

    mermaid.render(uniqueId, code).then(({ svg }) => {
      if (ref.current) {
        ref.current.innerHTML = svg;
        if (onRenderError) onRenderError('');
      }
    }).catch((err: unknown) => {
      const errorMessage = parseError(err);
      if (ref.current) {
        // Use textContent to avoid XSS via error messages containing user input
        ref.current.textContent = '';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'text-red-600';
        errorDiv.textContent = `Invalid Mermaid diagram: ${errorMessage}`;
        ref.current.appendChild(errorDiv);
      }
      if (onRenderError) onRenderError(errorMessage);
    });
  }, [code, onRenderError]);

  return <div ref={ref} className={className} />;
} 