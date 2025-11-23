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
        'javascript',
        'typescript',
        'jsx',
        'tsx',
        'python',
        'java',
        'go',
        'rust',
        'cpp',
        'c',
        'bash',
        'json',
        'yaml',
        'markdown',
        'html',
        'css',
        'sql',
        'php',
        'ruby',
        'swift',
        'kotlin',
        'zig',
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
    const langMap: Record<string, BundledLanguage> = {
      js: 'javascript',
      ts: 'typescript',
      py: 'python',
      sh: 'bash',
      yml: 'yaml',
    };

    const resolvedLang = (langMap[lang] || lang) as BundledLanguage;

    // Check if language is supported
    const supportedLangs = highlighter.getLoadedLanguages();
    const finalLang = supportedLangs.includes(resolvedLang) ? resolvedLang : 'text';

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
