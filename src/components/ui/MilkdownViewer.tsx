'use client';

import { useRef, useEffect } from 'react';
import { Editor, rootCtx, defaultValueCtx, editorViewOptionsCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { nord } from '@milkdown/theme-nord';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { prism } from '@milkdown/plugin-prism';

import '@milkdown/theme-nord/style.css';
import 'prismjs/themes/prism.css';

interface MilkdownViewerProps {
  content: string;
  className?: string;
}

function MilkdownViewerInner({ content }: MilkdownViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, content);
        ctx.update(editorViewOptionsCtx, (prev) => ({
          ...prev,
          editable: () => false,
        }));
      })
      .config(nord)
      .use(commonmark)
      .use(gfm)
      .use(prism)
  );

  // Add IDs to headings after Milkdown renders
  useEffect(() => {
    if (!containerRef.current) return;

    // Use MutationObserver to wait for Milkdown to render headings
    const addHeadingIds = () => {
      const headings = containerRef.current?.querySelectorAll('h1, h2, h3, h4, h5, h6');
      if (!headings || headings.length === 0) return false;

      // Track used IDs to handle duplicates
      const usedIds = new Map<string, number>();

      headings.forEach((heading) => {
        const text = heading.textContent || '';
        let baseId = text
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();

        // Handle empty or invalid IDs
        if (!baseId) {
          baseId = 'heading';
        }

        // Handle duplicates by appending a number
        let finalId = baseId;
        const count = usedIds.get(baseId) || 0;
        if (count > 0) {
          finalId = `${baseId}-${count + 1}`;
        }
        usedIds.set(baseId, count + 1);

        heading.id = finalId;
        // Make headings scrollable targets
        heading.setAttribute('data-heading', 'true');
      });
      return true;
    };

    // Try immediately first
    if (addHeadingIds()) return;

    // If no headings yet, watch for DOM changes
    const observer = new MutationObserver(() => {
      if (addHeadingIds()) {
        observer.disconnect();
      }
    });

    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [content]);

  return (
    <div ref={containerRef}>
      <Milkdown />
    </div>
  );
}

export function MilkdownViewer({ content, className = '' }: MilkdownViewerProps) {
  return (
    <MilkdownProvider>
      <div className={`milkdown-viewer ${className}`}>
        <MilkdownViewerInner content={content} />
      </div>
    </MilkdownProvider>
  );
}
