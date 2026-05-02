'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { safePostHog } from '@/lib/analytics/posthog';

// Mermaid bundle is ~200KB; defer until the section is in view.
const MermaidRenderer = dynamic(
  () => import('@/components/diagram/MermaidRenderer').then(m => m.MermaidRenderer),
  { ssr: false, loading: () => <div className="h-[420px] bg-[#fafafa] rounded animate-pulse" /> }
);

// Hand-crafted graph for vercel/next.js — represents the real top-level
// architecture so the hero shows actual product output, not a mockup.
const NEXT_JS_GRAPH = `flowchart TD
  CLI[next CLI] --> Build[next build]
  CLI --> Dev[next dev]
  CLI --> Start[next start]

  Build --> Compiler[Turbopack / SWC]
  Dev --> Compiler

  Compiler --> Bundler[Bundler]
  Compiler --> RSC[React Server Components]

  Bundler --> Pages[Pages Router]
  Bundler --> App[App Router]

  App --> Layouts[Layouts]
  App --> Server[Server Actions]
  App --> Cache[Cache Layer]

  RSC --> Hydrate[Client Hydration]
  Cache --> ISR[Incremental Static Regen]

  Pages --> Render[Render Pipeline]
  App --> Render
  Render --> Output[(.next output)]
`;

export function HeroDiagram() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // IntersectionObserver to defer mermaid bundle until needed.
    const el = document.getElementById('hero-diagram-root');
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div id="hero-diagram-root" className="relative">
      <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
        Live example
      </div>
      <h2 className="text-[25px] font-semibold text-[#111] mb-2">
        Architecture for <span className="font-mono">vercel/next.js</span>
      </h2>
      <p className="text-base text-[#aaa] mb-6">
        Auto-generated. Open any repo to see its own.
      </p>

      <div
        className={`relative bg-white border border-[#eee] rounded-lg p-6 overflow-x-auto hero-diagram-fade ${
          visible ? 'hero-diagram-visible' : ''
        }`}
      >
        {visible ? (
          <MermaidRenderer code={NEXT_JS_GRAPH} className="hero-diagram-svg flex justify-center" />
        ) : (
          <div className="h-[420px] bg-[#fafafa] rounded" />
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-base">
        <Link
          href="/vercel/next.js/diagram"
          onClick={() => safePostHog.capture('hero_diagram_explore_clicked', { repo: 'vercel/next.js' })}
          className="inline-flex items-center gap-1.5 text-[#111] hover:text-[#333] font-medium underline-offset-4 hover:underline"
        >
          Explore the live diagram for next.js
          <ArrowRight className="h-4 w-4" />
        </Link>
        <span className="text-[#aaa] text-[13px]">— or paste your own repo above.</span>
      </div>

      <style jsx>{`
        .hero-diagram-fade {
          opacity: 0;
          transform: translateY(8px);
          transition: opacity 600ms ease-out, transform 600ms ease-out;
        }
        .hero-diagram-fade.hero-diagram-visible {
          opacity: 1;
          transform: translateY(0);
        }
        :global(.hero-diagram-svg svg) {
          max-width: 100%;
          height: auto;
        }
        :global(.hero-diagram-svg svg .edgePath path),
        :global(.hero-diagram-svg svg .flowchart-link) {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: hero-stroke 1400ms ease-out forwards;
        }
        :global(.hero-diagram-svg svg .node) {
          opacity: 0;
          animation: hero-node 600ms ease-out forwards;
        }
        :global(.hero-diagram-svg svg .node:nth-child(1)) { animation-delay: 0ms; }
        :global(.hero-diagram-svg svg .node:nth-child(2)) { animation-delay: 80ms; }
        :global(.hero-diagram-svg svg .node:nth-child(3)) { animation-delay: 160ms; }
        :global(.hero-diagram-svg svg .node:nth-child(4)) { animation-delay: 240ms; }
        :global(.hero-diagram-svg svg .node:nth-child(5)) { animation-delay: 320ms; }
        :global(.hero-diagram-svg svg .node:nth-child(n+6)) { animation-delay: 400ms; }
        @keyframes hero-stroke {
          to { stroke-dashoffset: 0; }
        }
        @keyframes hero-node {
          to { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-diagram-fade,
          .hero-diagram-fade.hero-diagram-visible {
            opacity: 1;
            transform: none;
            transition: none;
          }
          :global(.hero-diagram-svg svg .edgePath path),
          :global(.hero-diagram-svg svg .flowchart-link),
          :global(.hero-diagram-svg svg .node) {
            stroke-dasharray: none;
            stroke-dashoffset: 0;
            opacity: 1;
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
