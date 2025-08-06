import React, { type ComponentProps } from 'react';
import { cn } from '~/lib/utils';
import { Button as ButtonBase, buttonVariants } from '@appdotbuild/design';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ComponentProps<typeof ButtonBase> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, onClick, children, ...props }, ref) => {
    return (
      <ButtonBase
        className={cn('rounded-none', className)}
        ref={ref}
        onClick={onClick}
        {...props}
      >
        {children}
      </ButtonBase>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
