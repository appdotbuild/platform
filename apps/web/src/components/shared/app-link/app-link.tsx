import { cn } from '@design/lib';
import { Link } from '@tanstack/react-router';

type AppLinkProps = {
  children: React.ReactNode;
  to: string;
  variant?: 'internal' | 'external';
} & React.ComponentProps<'a'>;

export function AppLink({
  children,
  to,
  variant = 'internal',
  className,
  ...props
}: AppLinkProps) {
  if (variant === 'external') {
    return (
      <a href={to} {...props}>
        {children}
      </a>
    );
  }

  return (
    <Link
      className={cn(
        'text-sm font-medium transition-colors text-muted-foreground hover:text-secondary-foreground active:text-foreground',
        className,
      )}
      to={to}
      {...props}
    >
      {children}
    </Link>
  );
}
