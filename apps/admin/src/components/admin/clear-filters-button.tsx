import { Button } from '@appdotbuild/design';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@appdotbuild/design';
import { useListContext } from 'ra-core';
import { FilterX } from 'lucide-react';

interface ClearFiltersButtonProps {
  /** Whether to always show the button (disabled when no filters) or hide when no filters */
  alwaysShow?: boolean;
  /** Custom button size */
  size?: 'default' | 'sm' | 'lg' | 'icon' | null | undefined;
  /** Show only icon without text */
  iconOnly?: boolean;
}

export function ClearFiltersButton({
  alwaysShow = false,
  size = 'sm',
  iconOnly = false,
}: ClearFiltersButtonProps = {}) {
  const { filterValues, setFilters } = useListContext();

  // Check if any filters are applied (excluding empty strings)
  const hasActiveFilters = Object.entries(filterValues).some(([, value]) => {
    return value !== undefined && value !== null && value !== '';
  });

  // Hide completely if not always showing and no active filters
  if (!alwaysShow && !hasActiveFilters) return null;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (hasActiveFilters) {
      setFilters({});
    }
  };

  const buttonContent = iconOnly ? (
    <FilterX className="h-4 w-4" />
  ) : (
    <>
      <FilterX className="h-4 w-4" />
      Clear filters
    </>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={hasActiveFilters ? 'outline' : 'ghost'}
            size={size}
            onClick={handleClick}
            disabled={!hasActiveFilters}
            className="flex items-center gap-2"
          >
            {buttonContent}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {hasActiveFilters
              ? 'Clear all applied filters'
              : 'No filters to clear'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
