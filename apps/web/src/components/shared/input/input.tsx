import * as React from 'react';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full h-full bg-transparent border-none outline-none text-black ${className}`}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';
