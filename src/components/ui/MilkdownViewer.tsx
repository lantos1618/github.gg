'use client';

import { useRef, useEffect } from 'react';
import { Editor, rootCtx, defaultValueCtx, editorViewOptionsCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { nord } from '@milkdown/theme-nord';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { prism, prismConfig } from '@milkdown/plugin-prism';

import zig from 'refractor/zig';
import docker from 'refractor/docker';
import graphql from 'refractor/graphql';
import lua from 'refractor/lua';
import makefile from 'refractor/makefile';
import csharp from 'refractor/csharp';
import elixir from 'refractor/elixir';
import scala from 'refractor/scala';
import solidity from 'refractor/solidity';
import toml from 'refractor/toml';
import jsx from 'refractor/jsx';
import tsx from 'refractor/tsx';

import '@milkdown/theme-nord/style.css';
import 'prismjs/themes/prism-tomorrow.css';

import { cn } from '@/lib/utils';

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

        ctx.set(prismConfig.key, {
          configureRefractor: (refractor) => {
            refractor.register(zig);
            refractor.register(docker);
            refractor.register(graphql);
            refractor.register(lua);
            refractor.register(makefile);
            refractor.register(csharp);
            refractor.register(elixir);
            refractor.register(scala);
            refractor.register(solidity);
            refractor.register(toml);
            refractor.register(jsx);
            refractor.register(tsx);
          },
        });
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
    <div ref={containerRef} className="milkdown-viewer-content">
      <Milkdown />
    </div>
  );
}

export function MilkdownViewer({ content, className = '' }: MilkdownViewerProps) {
  return (
    <MilkdownProvider>
      <div className={cn(
        "group relative bg-card border border-border rounded-xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md",
        className
      )}>
        {/* Decorative top highlight like in EnhancedCodeViewer/Insights */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
        
        <div className="p-6 md:p-8">
        <MilkdownViewerInner content={content} />
        </div>
      </div>
    </MilkdownProvider>
  );
}
