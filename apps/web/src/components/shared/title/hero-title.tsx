import { cn } from '~/lib/utils';

interface HeroTitleProps {
  className?: string;
  children: React.ReactNode;
  showAccent?: boolean;
}

export function HeroTitle({
  className,
  children,
  showAccent = true,
}: HeroTitleProps) {
  return (
    <h1
      className={cn(
        'relative mx-auto text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl xl:text-6xl',
        className,
      )}
      style={{ lineHeight: '1.125', letterSpacing: '-0.025em' }}
    >
      {children}
      {showAccent && (
        <span
          className="absolute -top-12 left-0 h-9 w-2 bg-primary md:-top-16 md:h-12 md:w-3 lg:-top-20 lg:h-14 lg:w-4"
          aria-hidden
        />
      )}
    </h1>
  );
}
