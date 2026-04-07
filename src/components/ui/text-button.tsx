import { cn } from '@/lib/utils';

interface TextButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  size?: 'sm' | 'base';
}

export function TextButton({ className, active, size = 'sm', children, ...props }: TextButtonProps) {
  return (
    <button
      className={cn(
        'border-b-2 transition-colors',
        size === 'sm' ? 'text-sm' : 'text-base',
        active
          ? 'border-[#111] text-[#111] font-semibold'
          : 'border-transparent text-[#999] hover:text-[#666] hover:border-[#666] active:text-[#111] active:border-[#111]',
        props.disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
