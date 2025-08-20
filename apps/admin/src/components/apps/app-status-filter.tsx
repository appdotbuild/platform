import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@appdotbuild/design';
import { ChevronDownIcon } from 'lucide-react';
import { useListContext } from 'ra-core';

export function AppStatusFilter() {
  const { filterValues, setFilters } = useListContext();
  const currentStatus = filterValues.appStatus || 'all';

  const handleStatusChange = (status: 'active' | 'deleted' | 'all') => {
    setFilters({
      ...filterValues,
      appStatus: status,
    });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'deleted':
        return 'Deleted';
      case 'all':
        return 'All';
      default:
        return 'All';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 text-sm font-normal">
          Status: {getStatusLabel(currentStatus).toLowerCase()}
          <ChevronDownIcon className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[120px]">
        <DropdownMenuItem
          onClick={() => handleStatusChange('all')}
          className={currentStatus === 'all' ? 'bg-accent' : ''}
        >
          All
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleStatusChange('active')}
          className={currentStatus === 'active' ? 'bg-accent' : ''}
        >
          Active
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleStatusChange('deleted')}
          className={currentStatus === 'deleted' ? 'bg-accent' : ''}
        >
          Deleted
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
