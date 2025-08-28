import { cn } from '@design/lib';

export function DecorationSquare({ className }: { className?: string }) {
  return (
    <span
      className={cn('h-1.5 w-1.5 rotate-45 bg-gray-500', className)}
      aria-hidden
    />
  );
}

export function DecorationPlus({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative h-0.5 w-3 bg-black after:absolute after:-top-[5px] after:left-[5px] after:h-3 after:w-0.5 after:bg-black',
        className,
      )}
      aria-hidden
    />
  );
}
