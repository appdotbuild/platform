import { Button } from '@appdotbuild/design';
import { useListContext } from 'ra-core';

export function AppStatusFilter() {
  const { filterValues, setFilters } = useListContext();
  const currentStatus = filterValues.appStatus || 'active';

  const handleStatusChange = (
    e: React.MouseEvent<HTMLButtonElement>,
    status: 'active' | 'deleted' | 'all',
  ) => {
    e.preventDefault();

    setFilters({
      ...filterValues,
      appStatus: status,
    });
  };

  return (
    <div className="flex items-center gap-1 border rounded-md p-1">
      <Button
        variant={currentStatus === 'active' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={(e) => {
          handleStatusChange(e, 'active');
        }}
        className="h-8 text-xs"
      >
        Active
      </Button>
      <Button
        variant={currentStatus === 'deleted' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={(e) => handleStatusChange(e, 'deleted')}
        className="h-8 text-xs"
      >
        Deleted
      </Button>
      <Button
        variant={currentStatus === 'all' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={(e) => handleStatusChange(e, 'all')}
        className="h-8 text-xs"
      >
        All
      </Button>
    </div>
  );
}
