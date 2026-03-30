import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureCardProps {
  title: string;
  description: string;
  label?: string;
  color?: string;
  icon?: LucideIcon;
  className?: string;
}

export function FeatureCard({ title, description, label, color = '#111', icon: _icon, className }: FeatureCardProps) {
  return (
    <div
      className={cn('bg-[#f8f9fa] py-[14px] px-[16px]', className)}
      style={{ borderLeft: `3px solid ${color}` }}
    >
      {label && (
        <div
          className="text-[12px] font-semibold uppercase tracking-[1px] mb-1"
          style={{ color }}
        >
          {label}
        </div>
      )}
      <div className="text-[14px] font-medium text-[#111] mb-1">{title}</div>
      <div className="text-[14px] text-[#666] leading-[1.6]">{description}</div>
    </div>
  );
}
