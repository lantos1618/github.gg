import { Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'loader' | 'refresh';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

export function LoadingSpinner({
  size = 'md',
  variant = 'loader',
  className,
  text,
}: LoadingSpinnerProps) {
  const Icon = variant === 'loader' ? Loader2 : RefreshCw;

  if (text) {
    return (
      <div className="flex flex-col items-center gap-3">
        <Icon className={cn(sizeClasses[size], 'text-muted-foreground animate-spin', className)} />
        <p className="text-muted-foreground text-sm">{text}</p>
      </div>
    );
  }

  return <Icon className={cn(sizeClasses[size], 'animate-spin', className)} />;
}

export function LoadingPage({ text }: { text?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

export function LoadingInline({ text }: { text?: string }) {
  return (
    <div className="flex items-center gap-2">
      <LoadingSpinner size="sm" />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}
