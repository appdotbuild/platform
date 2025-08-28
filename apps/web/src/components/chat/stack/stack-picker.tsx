import React from 'react';
import type { TemplateId } from '@appdotbuild/core';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  Badge,
} from '@appdotbuild/design';
import { Button } from '@appdotbuild/design';
import { ChevronDown } from 'lucide-react';
import { cn } from '@design/lib';
import { STACK_OPTIONS } from './stack-options';
import type { DeploymentTarget } from '~/components/chat/deployment/deployment-target-selector';

interface StackPickerProps {
  selectedStack: TemplateId;
  onStackChange: (stack: TemplateId) => void;
  disabled?: boolean;
  className?: string;
  deploymentTarget?: DeploymentTarget;
}

export function StackPicker({
  selectedStack,
  onStackChange,
  disabled = false,
  deploymentTarget = 'koyeb',
}: StackPickerProps) {
  const handleStackChange = (value: string) => {
    if (disabled) return;

    const stack = value as TemplateId;
    const functionalStack = STACK_OPTIONS.find((opt) => opt.id === stack);
    if (!functionalStack) return;

    // Prevent selecting non-NiceGUI stacks when Databricks is selected
    if (deploymentTarget === 'databricks' && stack !== 'nicegui_agent') {
      return;
    }

    onStackChange(stack);
  };

  const isStackDisabled = (stackId: TemplateId) => {
    return deploymentTarget === 'databricks' && stackId !== 'nicegui_agent';
  };

  const selectedOption = STACK_OPTIONS.find((opt) => opt.id === selectedStack);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <div className="flex items-center gap-1.5">
            {selectedOption?.name}
            {selectedOption?.status === 'beta' && (
              <Badge
                variant="beta"
                className="text-xs px-1 py-0"
                aria-label="Beta version"
              >
                BETA
              </Badge>
            )}
            {deploymentTarget === 'databricks' &&
              selectedStack === 'nicegui_agent' && (
                <Badge
                  variant="secondary"
                  className="text-xs px-1 py-0"
                  aria-label="Databricks compatible"
                >
                  DBX
                </Badge>
              )}
          </div>
          <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 p-1">
        <DropdownMenuRadioGroup
          value={selectedStack}
          onValueChange={handleStackChange}
        >
          {STACK_OPTIONS.map((stack) => {
            const disabled = isStackDisabled(stack.id);
            return (
              <DropdownMenuRadioItem
                key={stack.id}
                value={stack.id}
                disabled={disabled}
                className={cn(
                  'text-sm py-2 cursor-pointer focus:bg-gray-50',
                  disabled && 'opacity-50 cursor-not-allowed',
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    {React.createElement(stack.icon, {
                      className: cn(
                        'w-4 h-4 mr-3',
                        disabled ? 'text-gray-300' : 'text-gray-500',
                      ),
                    })}
                    <div>
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'font-medium',
                            disabled && 'text-gray-400',
                          )}
                        >
                          {stack.name}
                        </div>
                        {stack.status === 'beta' && (
                          <Badge
                            variant="beta"
                            className="text-xs px-1.5 py-0.5"
                            aria-label="Beta version"
                          >
                            BETA
                          </Badge>
                        )}
                      </div>
                      <div
                        className={cn(
                          'text-xs',
                          disabled ? 'text-gray-400' : 'text-gray-500',
                        )}
                      >
                        {stack.description}
                      </div>
                    </div>
                  </div>
                </div>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
