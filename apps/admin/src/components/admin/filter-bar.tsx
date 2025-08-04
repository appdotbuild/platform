import React from 'react';
import { Filter } from 'lucide-react';
import { useListContext } from 'ra-core';
import { ClearFiltersButton } from '@/components/admin/clear-filters-button';
import { AppliedFiltersIndicator } from '@/components/admin/applied-filters-indicator';

interface FilterBarProps {
  children: React.ReactNode;
  filterLabels?: Record<string, string>;
  valueFormatter?: (key: string, value: any) => string;
}

export function FilterBar({
  children,
  filterLabels,
  valueFormatter,
}: FilterBarProps) {
  const { filterValues } = useListContext();

  const hasActiveFilters = Object.entries(filterValues).some(([, value]) => {
    return value !== undefined && value !== null && value !== '';
  });

  return (
    <div className="space-y-4 p-6 bg-card rounded-lg border flex-1">
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filter & Search
          {hasActiveFilters && (
            <span className="bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded font-medium border">
              {
                Object.keys(filterValues).filter(
                  (key) =>
                    filterValues[key] !== undefined &&
                    filterValues[key] !== null &&
                    filterValues[key] !== '',
                ).length
              }
            </span>
          )}
        </div>
        <ClearFiltersButton />
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">{children}</div>

      {/* Applied Filters */}
      {hasActiveFilters && (
        <div className="pt-3 border-t border-border/50">
          <AppliedFiltersIndicator
            filterLabels={filterLabels}
            valueFormatter={valueFormatter}
          />
        </div>
      )}
    </div>
  );
}
