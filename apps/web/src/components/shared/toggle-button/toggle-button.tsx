'use client';

import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/shared/button';

interface ToggleButtonProps {
  isOpen: boolean;
  onClick: () => void;
  icon: LucideIcon;
  title: string;
  className?: string;
}

export function ToggleButton({
  isOpen,
  onClick,
  icon: Icon,
  title,
  className,
}: ToggleButtonProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant="toggle"
      size="none"
      className={className}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-6 h-6 text-gray-600 group-hover:text-gray-800 transition-colors" />
        <span className="text-medium font-medium">{title}</span>
      </div>
      <ChevronDown
        className={cn(
          'w-5 h-5 transition-transform duration-200',
          isOpen && 'rotate-180',
        )}
      />
    </Button>
  );
}
