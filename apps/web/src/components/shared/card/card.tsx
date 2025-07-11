import { cn } from '~/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'error' | 'success' | 'warning' | 'info' | 'amber';
}

interface CardHeaderProps {
  icon: string | React.ReactNode;
  title: string;
  className?: string;
  variant?: 'default' | 'error' | 'success' | 'warning' | 'info' | 'amber';
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

interface CardHeadlineProps {
  icon?: string | React.ReactNode;
  text: string;
  className?: string;
  variant?: 'default' | 'error' | 'success' | 'warning' | 'info' | 'amber';
}

const variantStyles = {
  default: {
    container: 'border-border hover:border-input',
    header: 'bg-gradient-to-r from-muted to-background',
    divider: 'border-border',
    title: 'text-foreground',
    headline: 'bg-muted border-b border-border',
    headlineText: 'text-foreground',
  },
  error: {
    container: 'border-red-200 hover:border-red-300',
    header: 'bg-red-50 border-b border-red-200',
    divider: 'border-red-100',
    title: 'text-red-800',
    headline: 'bg-red-50 border-b border-red-200',
    headlineText: 'text-red-800',
  },
  success: {
    container: 'border-green-200 hover:border-green-300',
    header: 'bg-green-50 border-b border-green-200',
    divider: 'border-green-100',
    title: 'text-green-800',
    headline:
      'bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200',
    headlineText: 'text-green-800',
  },
  warning: {
    container: 'border-yellow-200 hover:border-yellow-300',
    header: 'bg-yellow-50 border-b border-yellow-200',
    divider: 'border-yellow-100',
    title: 'text-yellow-800',
    headline: 'bg-yellow-50 border-b border-yellow-200',
    headlineText: 'text-yellow-800',
  },
  info: {
    container: 'border-blue-200 hover:border-blue-300',
    header: 'bg-blue-50 border-b border-blue-200',
    divider: 'border-blue-100',
    title: 'text-blue-800',
    headline: 'bg-blue-50 border-b border-blue-200',
    headlineText: 'text-blue-800',
  },
  amber: {
    container: 'border-amber-200 hover:border-amber-300',
    header: 'bg-amber-50 border-b border-amber-200',
    divider: 'border-amber-100',
    title: 'text-amber-800',
    headline: 'bg-amber-50 border-b border-amber-200',
    headlineText: 'text-amber-800',
  },
};

export function Card({ children, className, variant = 'default' }: CardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        'group relative border rounded-lg overflow-hidden transition-colors',
        styles.container,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  icon,
  title,
  className,
  variant = 'default',
}: CardHeaderProps) {
  const styles = variantStyles[variant];

  return (
    <>
      <div className={cn('px-4 pt-3 pb-2', styles.header, className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {typeof icon === 'string' ? (
              <span className="text-base">{icon}</span>
            ) : (
              icon
            )}
            <span className={cn('font-semibold text-sm', styles.title)}>
              {title}
            </span>
          </div>
        </div>
      </div>
      <div className={cn('w-full border-t', styles.divider)} />
    </>
  );
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn('px-4 py-3', className)}>{children}</div>;
}

export function CardHeadline({
  icon,
  text,
  className,
  variant = 'default',
}: CardHeadlineProps) {
  const styles = variantStyles[variant];

  return (
    <div className={cn('px-4 py-2', styles.headline, className)}>
      <div className="flex items-center gap-2">
        {icon &&
          (typeof icon === 'string' ? (
            <span className="text-sm">{icon}</span>
          ) : (
            icon
          ))}
        <span className={cn('text-xs font-medium', styles.headlineText)}>
          {text}
        </span>
      </div>
    </div>
  );
}
