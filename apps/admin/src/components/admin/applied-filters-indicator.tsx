import { Badge } from '@appdotbuild/design';
import { useListContext } from 'ra-core';

interface AppliedFiltersIndicatorProps {
  /**
   * Custom labels for filter keys
   * @example { q: "Search", ownerId: "Owner" }
   */
  filterLabels?: Record<string, string>;
  /**
   * Custom formatter for filter values
   * @example (key, value) => key === 'date' ? formatDate(value) : String(value)
   */
  valueFormatter?: (key: string, value: any) => string;
}

export function AppliedFiltersIndicator({
  filterLabels = {},
  valueFormatter,
}: AppliedFiltersIndicatorProps = {}) {
  const { filterValues } = useListContext();

  const activeFilters = Object.entries(filterValues).filter(([, value]) => {
    return value !== undefined && value !== null && value !== '';
  });

  if (activeFilters.length === 0) return null;

  const getFilterLabel = (key: string) => {
    // Use custom label if provided, otherwise use default mappings
    if (filterLabels[key]) return filterLabels[key];

    // Default label mappings
    const defaultLabels: Record<string, string> = {
      q: 'Search',
      ownerId: 'Owner',
      status: 'Status',
      createdAt: 'Created',
      updatedAt: 'Updated',
    };

    return defaultLabels[key] || key;
  };

  const formatValue = (key: string, value: any) => {
    if (valueFormatter) {
      return valueFormatter(key, value);
    }
    return String(value);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {activeFilters.map(([key, value]) => (
        <Badge key={key} variant="secondary" className="text-xs">
          {getFilterLabel(key)}: {formatValue(key, value)}
        </Badge>
      ))}
    </div>
  );
}
