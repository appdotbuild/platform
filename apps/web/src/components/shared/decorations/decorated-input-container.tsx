import { DecorationPlus, DecorationSquare } from './decorations';

interface DecoratedInputContainerProps {
  children: React.ReactNode;
  className?: string;
  showBottomBorder?: boolean;
}

export function DecoratedInputContainer({
  children,
  className = 'relative w-full max-w-4xl mx-auto',
  showBottomBorder = true,
}: DecoratedInputContainerProps) {
  return (
    <div className={className}>
      <div
        className="w-full flex flex-col gap-2"
        style={{ viewTransitionName: 'chat-input' }}
      >
        {children}
      </div>

      <span
        className="absolute left-1/2 top-0 -ml-[50vw] h-px w-screen border-t border-dashed border-black/20"
        aria-hidden
      />
      {showBottomBorder && (
        <span
          className="absolute left-1/2 bottom-0 -ml-[50vw] h-px w-screen border-t border-dashed border-black/20"
          aria-hidden
        />
      )}
      <DecorationPlus className="absolute -left-1.5 top-0 z-10" />
      <DecorationPlus className="absolute -right-1.5 bottom-0 z-10" />
      <DecorationSquare className="absolute -bottom-0.5 -left-24 z-10" />
      <DecorationSquare className="absolute -right-24 -top-0.5 z-10" />
    </div>
  );
}
