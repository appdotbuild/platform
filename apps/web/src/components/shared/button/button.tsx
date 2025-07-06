import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';

import { cn } from '~/lib/utils';

const buttonVariants = cva(
  'relative inline-flex items-center justify-center gap-1 whitespace-nowrap font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'shadow-xs bg-primary text-primary-foreground hover:bg-primary/85 hover:text-primary-foreground',
        secondary:
          'shadow-xs bg-secondary-foreground text-primary-foreground hover:bg-[#35353B] active:bg-[#242429] hover:text-primary-foreground',
        gradient:
          'bg-[rgba(113,113,122,0.16)] text-secondary-foreground hover:bg-[rgba(113,113,122,0.32)] active:bg-[rgba(113,113,122,0.40)]',
        outline:
          'shadow-xs border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        toggle:
          'w-full h-16 border border-gray-300 rounded-lg bg-white text-black flex justify-between items-center px-6 hover:bg-gray-50 transition-colors duration-200 shadow-sm group',
        none: '',
      },
      size: {
        default: 'h-9 px-4 py-2 text-sm',
        xs: 'h-6 px-2.5 text-xs leading-none',
        sm: 'h-8 px-3.5 text-sm',
        md: 'h-8.5 px-4.5 text-sm md:text-base leading-none -tracking-tighter text-black',
        lg: 'h-11 text-sm px-4 lg:px-3.5 lg:text-base py-3',
        xl: 'h-11 px-10 text-base leading-none -tracking-tighter',
        icon: 'size-9',
        badge: 'h-5.5 px-2.5 py-1 text-xs leading-tight -tracking-tighter',
        none: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
    compoundVariants: [
      {
        variant: ['gradient'],
        className: 'w-full z-20 -tracking-tighter',
      },
    ],
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, onClick, children, ...props },
    ref,
  ) => {
    if (asChild) {
      // Por enquanto, não suportamos asChild com React 19
      console.warn('asChild prop is not supported yet with React 19');
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={onClick}
        {...props}
      >
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
