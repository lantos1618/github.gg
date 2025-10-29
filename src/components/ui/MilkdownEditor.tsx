'use client';

import { useRef } from 'react';
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { nord } from '@milkdown/theme-nord';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { history } from '@milkdown/plugin-history';
import { prism } from '@milkdown/plugin-prism';

import '@milkdown/theme-nord/style.css';
import 'prismjs/themes/prism-tomorrow.css';

interface MilkdownEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
}

function MilkdownEditorInner({ content, onChange, placeholder }: MilkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const editorInfo = useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, content);
        ctx.get(listenerCtx).markdownUpdated((ctx, markdown) => {
          onChange(markdown);
        });
      })
      .config(nord)
      .use(commonmark)
      .use(gfm)
      .use(prism)
      .use(history)
      .use(listener)
  );

  return (
    <div ref={containerRef}>
      <Milkdown />
    </div>
  );
}

export function MilkdownEditor(props: MilkdownEditorProps) {
  return (
    <MilkdownProvider>
      <div className="milkdown-editor border border-border rounded-lg p-4 min-h-[400px]">
        <MilkdownEditorInner {...props} />
      </div>
    </MilkdownProvider>
  );
}
