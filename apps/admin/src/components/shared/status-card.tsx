import { ReactNode } from 'react';
import { cn } from '@appdotbuild/design';

type StatusCardVariant = 'error' | 'success' | 'neutral' | 'info';

type StatusCardProps = {
  variant: StatusCardVariant;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
};

const variantConfig = {
  error: {
    borderColor: 'border-red-800',
    bgColor: 'bg-red-950/10',
    barColor: 'bg-red-500',
  },
  success: {
    borderColor: 'border-green-800',
    bgColor: 'bg-green-950/10',
    barColor: 'bg-green-500',
  },
  info: {
    borderColor: 'border-blue-800',
    bgColor: 'bg-blue-950/10',
    barColor: 'bg-blue-500',
  },
  neutral: {
    borderColor: 'border-gray-800',
    bgColor: 'bg-gray-900/50',
    barColor: 'bg-blue-500',
  },
};

export function StatusCard({
  variant,
  children,
  action,
  className,
}: StatusCardProps) {
  const config = variantConfig[variant];

  return (
    <div
      className={cn(
        'border rounded-lg transition-all duration-200',
        config.borderColor,
        config.bgColor,
        className,
      )}
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className={cn('w-1 h-12 rounded-full', config.barColor)}></div>
            <div className="flex-1">{children}</div>
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      </div>
    </div>
  );
}

export default StatusCard;
