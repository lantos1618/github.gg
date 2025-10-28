'use client';

import { useEffect, useState, ReactNode } from 'react';

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
  actions?: ReactNode;
}

export function TableOfContents({ content, actions }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // Extract headings from markdown content
    const headingRegex = /^(#{1,4})\s+(.+)$/gm;
    const extractedHeadings: Heading[] = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      // Create a slug from the heading text
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      extractedHeadings.push({ id, text, level });
    }

    setHeadings(extractedHeadings);
  }, [content]);

  useEffect(() => {
    if (headings.length === 0) return;

    // Set initial active heading
    const setInitialActiveHeading = () => {
      const firstHeading = document.getElementById(headings[0].id);
      if (firstHeading) {
        setActiveId(headings[0].id);
      }
    };

    // Delay to ensure headings are rendered
    const timeoutId = setTimeout(setInitialActiveHeading, 100);

    // Track which heading is currently in view
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry that's intersecting and closest to the top
        const intersectingEntries = entries.filter((entry) => entry.isIntersecting);
        if (intersectingEntries.length > 0) {
          // Sort by position (top-most first)
          intersectingEntries.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          setActiveId(intersectingEntries[0].target.id);
        }
      },
      {
        rootMargin: '-100px 0px -66% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    // Wait for headings to be in DOM
    const observeHeadings = () => {
      let observedCount = 0;
      headings.forEach(({ id }) => {
        const element = document.getElementById(id);
        if (element) {
          observer.observe(element);
          observedCount++;
        }
      });

      // If no headings found, try again
      if (observedCount === 0 && headings.length > 0) {
        setTimeout(observeHeadings, 100);
      }
    };

    observeHeadings();

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [headings]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav className="sticky top-20 w-full h-fit max-h-[calc(100vh-6rem)] overflow-y-auto">
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">On this page</h2>
          {actions && <div>{actions}</div>}
        </div>
        <ul className="space-y-2 text-sm">
          {headings.map((heading) => {
            const isActive = activeId === heading.id;
            const paddingLeft = (heading.level - 1) * 12;

            return (
              <li key={heading.id} style={{ paddingLeft: `${paddingLeft}px` }}>
                <a
                  href={`#${heading.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const element = document.getElementById(heading.id);
                    if (element) {
                      // Temporarily set active state for immediate feedback
                      setActiveId(heading.id);

                      // Use native scroll into view for smooth behavior
                      element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      });
                    }
                  }}
                  className={`block py-1.5 transition-all hover:text-foreground cursor-pointer ${
                    isActive
                      ? 'text-foreground underline border-l-2 border-black dark:border-white pl-3 -ml-3'
                      : 'text-muted-foreground border-l-2 border-transparent pl-3 -ml-3 hover:border-l-2 hover:border-muted hover:pl-3'
                  }`}
                >
                  {heading.text}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
