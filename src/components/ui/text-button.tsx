import { cn } from '@/lib/utils';

interface TextButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  size?: 'sm' | 'base';
}

export function TextButton({ className, active, size = 'sm', children, ...props }: TextButtonProps) {
  return (
    <button
      className={cn(
        'relative pb-1 transition-colors',
        'after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:transition-transform after:duration-200 after:ease-out after:origin-left',
        size === 'sm' ? 'text-sm' : 'text-base',
        active
          ? 'text-[#111] font-semibold after:scale-x-100 after:bg-[#111]'
          : 'text-[#999] hover:text-[#666] active:text-[#111] after:scale-x-0 hover:after:scale-x-100 after:bg-[#666] active:after:bg-[#111]',
        props.disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
