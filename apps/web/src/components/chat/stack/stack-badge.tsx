import type { TemplateId } from '@appdotbuild/core';
import { Badge } from '@appdotbuild/design';
import { cn } from '@design/lib';
import { createElement, useMemo } from 'react';
import { STACK_OPTIONS } from '~/components/chat/stack/stack-options';

type StackBadgeProps = {
  templateId: TemplateId;
  variant?: 'default' | 'secondary' | 'outline';
  className?: string;
};

export function StackBadge({
  templateId,
  variant = 'secondary',
  className,
}: StackBadgeProps) {
  const stackOption = useMemo(
    () => STACK_OPTIONS.find((option) => option.id === templateId),
    [templateId],
  );

  if (!stackOption) {
    return null;
  }

  return (
    <Badge
      variant={variant}
      className={cn('flex items-center gap-1.5 text-xs', className)}
    >
      <span>{createElement(stackOption.icon, { className: 'w-4 h-4' })}</span>
      <span>{stackOption.name}</span>
    </Badge>
  );
}
