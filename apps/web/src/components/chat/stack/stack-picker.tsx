import React from 'react';
import type { TemplateId } from '@appdotbuild/core';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@appdotbuild/design';
import { Button } from '~/components/shared/button';
import { ChevronDown } from 'lucide-react';
import { STACK_OPTIONS } from './stack-options';

interface StackPickerProps {
  selectedStack: TemplateId;
  onStackChange: (stack: TemplateId) => void;
  disabled?: boolean;
  className?: string;
}

export function StackPicker({
  selectedStack,
  onStackChange,
  disabled = false,
}: StackPickerProps) {
  const handleStackChange = (value: string) => {
    if (disabled) return;

    const stack = value as TemplateId;
    const functionalStack = STACK_OPTIONS.find((opt) => opt.id === stack);
    if (!functionalStack) return;

    onStackChange(stack);
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
          {selectedOption?.name}
          <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 p-1">
        <DropdownMenuRadioGroup
          value={selectedStack}
          onValueChange={handleStackChange}
        >
          {STACK_OPTIONS.map((stack) => (
            <DropdownMenuRadioItem
              key={stack.id}
              value={stack.id}
              className="text-sm py-2 cursor-pointer focus:bg-gray-50"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  {React.createElement(stack.icon, {
                    className: 'w-4 h-4 mr-3 text-gray-500',
                  })}
                  <div>
                    <div className="font-medium">{stack.name}</div>
                    <div className="text-xs text-gray-500">
                      {stack.description}
                    </div>
                  </div>
                </div>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
