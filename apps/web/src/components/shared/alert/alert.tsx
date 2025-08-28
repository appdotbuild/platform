import { cn } from '@design/lib';

interface AlertProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
}

const variantStyles = {
  default: {
    container: 'bg-background border-border',
    text: 'text-foreground',
    icon: 'text-foreground',
  },
  success: {
    container: 'bg-green-50 border-green-200',
    text: 'text-green-700',
    icon: 'text-green-500',
  },
  error: {
    container: 'bg-red-50 border-red-200',
    text: 'text-red-700',
    icon: 'text-red-500',
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200',
    text: 'text-yellow-700',
    icon: 'text-yellow-500',
  },
  info: {
    container: 'bg-blue-50 border-blue-200',
    text: 'text-foreground',
    icon: 'text-blue-500',
  },
};

const variantIcons = {
  default: 'ℹ',
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

export function Alert({
  children,
  className,
  variant = 'default',
}: AlertProps) {
  const styles = variantStyles[variant];
  const icon = variantIcons[variant];

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border',
        styles.container,
        className,
      )}
    >
      <span className={cn('text-lg', styles.icon)}>{icon}</span>
      <div className={cn('text-sm', styles.text)}>{children}</div>
    </div>
  );
}
