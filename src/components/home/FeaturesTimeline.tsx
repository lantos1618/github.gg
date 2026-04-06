'use client';

import { FeatureRequestBox } from './FeatureRequestBox';
import { PageWidthContainer } from '@/components/PageWidthContainer';

interface Feature {
  title: string;
  description: string;
  completed: boolean;
}

interface FeaturesTimelineProps {
  features: Feature[];
}

export function FeaturesTimeline({ features }: FeaturesTimelineProps) {
  const sortedFeatures = [...features].sort((a, b) => {
    if (a.completed && !b.completed) return -1;
    if (!a.completed && b.completed) return 1;
    return 0;
  });

  return (
    <PageWidthContainer className="py-16">
      <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
        Roadmap
      </div>
      <h2 className="text-[25px] font-semibold text-[#111] mb-2">Features</h2>
      <p className="text-base text-[#aaa] mb-8">What's shipped and what's next</p>

      <div className="space-y-[2px] mb-12">
        {sortedFeatures.map((feature, index) => {
          const color = feature.completed ? '#34a853' : '#aaa';
          return (
            <div key={index} className="flex">
              <div
                className="min-w-[32px] text-base font-semibold pt-[14px] text-center"
                style={{ color }}
              >
                {feature.completed ? '~' : (index + 1).toString()}
              </div>
              <div
                className="bg-[#f8f9fa] py-[14px] px-[16px] flex-1"
                style={{ borderLeft: `3px solid ${color}` }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base font-medium text-[#111]">{feature.title}</span>
                  {feature.completed && (
                    <span className="text-[13px] font-semibold uppercase tracking-[1px] text-[#34a853]">
                      Shipped
                    </span>
                  )}
                </div>
                <div className="text-base text-[#666] leading-[1.6]">
                  {feature.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <FeatureRequestBox />

      <div className="mt-12 text-[13px] text-[#aaa] text-center">
        GG is not affiliated with GitHub, Inc. GitHub is a registered trademark of GitHub, Inc.
      </div>
    </PageWidthContainer>
  );
}
