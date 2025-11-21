'use client';

import { BarChart3, Network, FileText, Shield, Zap, Bot } from 'lucide-react';

const features = [
  {
    icon: BarChart3,
    title: "Scorecards",
    description: "Instant health check on code quality and complexity."
  },
  {
    icon: Network,
    title: "Diagrams",
    description: "Visualizing dependencies, flow, and class structures."
  },
  {
    icon: Bot,
    title: "Slop Detector",
    description: "Identifying low-quality AI-generated code."
  },
  {
    icon: Shield,
    title: "Security",
    description: "Spotting vulnerabilities before production."
  },
  {
    icon: FileText,
    title: "Docs",
    description: "Turning codebases into readable wikis automatically."
  },
  {
    icon: Zap,
    title: "Reviews",
    description: "AI bot reviews on every Pull Request."
  }
];

export function FeatureGrid() {
  return (
    <div className="py-32 bg-white border-t border-gray-100">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16 max-w-6xl mx-auto">
          {features.map((feature, idx) => (
            <div key={idx} className="group">
              <div className="mb-6 text-black opacity-80 group-hover:opacity-100 transition-opacity">
                <feature.icon className="h-8 w-8 stroke-1" />
              </div>
              <h3 className="text-xl font-medium text-black mb-3 tracking-tight">{feature.title}</h3>
              <p className="text-gray-500 font-light leading-relaxed group-hover:text-gray-900 transition-colors">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
