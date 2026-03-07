'use client';

import { useRef } from 'react';
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { nord } from '@milkdown/theme-nord';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { history } from '@milkdown/plugin-history';
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
import typescript from 'refractor/typescript';
import javascript from 'refractor/javascript';
import css from 'refractor/css';
import markup from 'refractor/markup';
import json from 'refractor/json';

import '@milkdown/theme-nord/style.css';
import 'prismjs/themes/prism-coy.css';

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
            refractor.register(typescript);
            refractor.register(javascript);
            refractor.register(css);
            refractor.register(markup);
            refractor.register(json);
          },
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
