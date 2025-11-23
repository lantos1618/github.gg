'use client';

import { useEffect, useRef } from 'react';
import type { BundledLanguage, BundledTheme, HighlighterGeneric } from 'shiki';
import { codeToHtml, createHighlighter } from 'shiki';

let highlighter: HighlighterGeneric<BundledLanguage, BundledTheme> | null = null;

async function getHighlighter() {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: [
        import('shiki/langs/javascript.mjs'),
        import('shiki/langs/typescript.mjs'),
        import('shiki/langs/jsx.mjs'),
        import('shiki/langs/tsx.mjs'),
        import('shiki/langs/python.mjs'),
        import('shiki/langs/java.mjs'),
        import('shiki/langs/go.mjs'),
        import('shiki/langs/rust.mjs'),
        import('shiki/langs/cpp.mjs'),
        import('shiki/langs/c.mjs'),
        import('shiki/langs/bash.mjs'),
        import('shiki/langs/json.mjs'),
        import('shiki/langs/yaml.mjs'),
        import('shiki/langs/markdown.mjs'),
        import('shiki/langs/html.mjs'),
        import('shiki/langs/css.mjs'),
        import('shiki/langs/sql.mjs'),
        import('shiki/langs/php.mjs'),
        import('shiki/langs/ruby.mjs'),
        import('shiki/langs/swift.mjs'),
        import('shiki/langs/kotlin.mjs'),
        import('shiki/langs/zig.mjs'),
        import('shiki/langs/docker.mjs'),
        import('shiki/langs/dockerfile.mjs'),
        import('shiki/langs/graphql.mjs'),
        import('shiki/langs/lua.mjs'),
        import('shiki/langs/makefile.mjs'),
        import('shiki/langs/csharp.mjs'),
        import('shiki/langs/elixir.mjs'),
        import('shiki/langs/scala.mjs'),
        import('shiki/langs/solidity.mjs'),
        import('shiki/langs/toml.mjs'),
      ],
    });
  }
  return highlighter;
}

// Helper function to escape HTML
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Helper function to highlight code with Shiki
async function highlightCodeWithShiki(code: string, lang: string): Promise<string> {
  try {
    const highlighter = await getHighlighter();

    // Map common aliases to actual language names
    const langMap: Record<string, string> = {
      js: 'javascript',
      ts: 'typescript',
      py: 'python',
      sh: 'bash',
      yml: 'yaml',
      cs: 'csharp',
      'c#': 'csharp',
    };

    const resolvedLang = (langMap[lang] || lang);

    // Check if language is supported
    const supportedLangs = highlighter.getLoadedLanguages();
    // Using 'any' cast because BundledLanguage type inference gets tricky with dynamic imports
    const finalLang = supportedLangs.includes(resolvedLang as any) ? (resolvedLang as BundledLanguage) : 'text';

    return await codeToHtml(code, {
      lang: finalLang,
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
    });
  } catch (error) {
    console.error('Shiki highlighting error:', error);
    // Fallback to plain code block with escaped HTML
    const escapedCode = escapeHtml(code);
    return `<pre><code class="language-${lang}">${escapedCode}</code></pre>`;
  }
}

interface ShikiCodeHighlighterProps {
  code: string;
  language: string;
  className?: string;
}

export function ShikiCodeHighlighter({ code, language, className = '' }: ShikiCodeHighlighterProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    highlightCodeWithShiki(code, language).then((html) => {
      if (ref.current) {
        try {
          ref.current.innerHTML = html;
        } catch (error) {
          console.error('Failed to set innerHTML:', error);
          // Fallback: show plain code
          ref.current.textContent = code;
        }
      }
    }).catch((error) => {
      console.error('Failed to highlight code:', error);
      if (ref.current) {
        ref.current.textContent = code;
      }
    });
  }, [code, language]);

  return (
    <div
      ref={ref}
      className={`shiki-wrapper rounded-xl overflow-hidden border border-border my-6 ${className}`}
    >
      {/* Fallback while loading */}
      <pre className="p-4 bg-muted">
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
}

// Hook to automatically highlight code blocks in a container
export function useShikiHighlighting(containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!containerRef.current) return;

    const codeBlocks = containerRef.current.querySelectorAll('pre code[class*="language-"]');

    codeBlocks.forEach(async (block) => {
      const pre = block.parentElement;
      if (!pre) return;

      const code = block.textContent || '';
      const classList = Array.from(block.classList);
      const languageClass = classList.find((cls) => cls.startsWith('language-'));
      const language = languageClass ? languageClass.replace('language-', '') : 'text';

      try {
        const html = await highlightCodeWithShiki(code, language);

        // Create a wrapper div
        const wrapper = document.createElement('div');
        wrapper.className = 'shiki-wrapper rounded-xl overflow-hidden border border-border my-6';

        try {
          wrapper.innerHTML = html;
          // Replace the pre element with the wrapper
          pre.replaceWith(wrapper);
        } catch (innerError) {
          console.error('Failed to set innerHTML for code block:', innerError);
          // Keep the original pre element if innerHTML fails
        }
      } catch (error) {
        console.error('Failed to highlight code block:', error);
      }
    });
  }, [containerRef]);
}
