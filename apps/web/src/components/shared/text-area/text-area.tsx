import { forwardRef, useEffect, useRef } from 'react';
import { cn } from '~/lib/utils';

interface TextareaProps extends React.ComponentProps<'textarea'> {
  maxHeight?: number;
  minHeight?: number;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { className, maxHeight = 200, minHeight = 64, value, onChange, ...props },
    ref,
  ) => {
    const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
      const textArea = textAreaRef.current;
      if (textArea) {
        const offsetBorder = 6;
        textArea.style.minHeight = `${minHeight + offsetBorder}px`;
        textArea.style.maxHeight = `${maxHeight}px`;
        textArea.style.height = `${minHeight + offsetBorder}px`;

        const scrollHeight = textArea.scrollHeight;
        if (scrollHeight > maxHeight) {
          textArea.style.height = `${maxHeight}px`;
          textArea.style.overflowY = 'auto';
        } else {
          textArea.style.height = `${scrollHeight + offsetBorder}px`;
          textArea.style.overflowY = 'hidden';
        }
      }
    }, [value, minHeight, maxHeight]);

    return (
      <textarea
        ref={(node) => {
          textAreaRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        data-slot="textarea"
        className={cn(
          'w-full bg-transparent border-none outline-none text-black transition-height',
          className,
        )}
        value={value}
        onChange={onChange}
        {...props}
      />
    );
  },
);

Textarea.displayName = 'Textarea';

export { Textarea };
