'use client';

import { useEffect, useState, ReactNode } from 'react';

export interface Heading {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  // Accept either pre-parsed headings (SSR) or content to parse (legacy)
  headings?: Heading[];
  content?: string;
  actions?: ReactNode;
}

export function TableOfContents({ headings: initialHeadings, content, actions }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<Heading[]>(initialHeadings || []);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // If headings were provided (SSR), use them
    if (initialHeadings) {
      setHeadings(initialHeadings);
      return;
    }

    // Otherwise, extract from content (legacy support)
    if (!content) return;

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
  }, [initialHeadings, content]);

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
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">On this page</h2>
          {actions && <div>{actions}</div>}
        </div>
        <ul className="space-y-1.5 text-sm border-l-2 border-gray-200 dark:border-gray-700">
          {headings.map((heading) => {
            const isActive = activeId === heading.id;
            const paddingLeft = (heading.level - 1) * 12 + 12; // Base 12px + level offset

            return (
              <li key={heading.id}>
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
                  style={{ paddingLeft: `${paddingLeft}px` }}
                  className={`block py-1.5 transition-all cursor-pointer hover:text-foreground relative ${
                    isActive
                      ? 'text-foreground font-medium before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-blue-600'
                      : 'text-muted-foreground'
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
