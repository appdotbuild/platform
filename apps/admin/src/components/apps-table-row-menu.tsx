import { Row } from '@tanstack/react-table';
import { MoreHorizontal, ExternalLink, FileSearch2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { getAppReadUrl } from '../lib/api/apps';

interface AppsTableRowMenuProps {
  row: Row<any>;
}

export default function AppsTableRowMenu({ row }: AppsTableRowMenuProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleViewCode = async () => {
    setIsLoading(true);
    try {
      const { readUrl } = await getAppReadUrl(row.original.id);
      window.open(readUrl, '_blank');
    } catch (error) {
      console.error('Failed to get read URL:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
        <Link to="/dashboard/apps/$id" params={{ id: row.original.id }}>
          <FileSearch2 className="h-4 w-4" />
          <span className="sr-only">View</span>
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={handleViewCode} disabled={isLoading}>
            <ExternalLink className="mr-2 h-4 w-4" />
            {isLoading ? 'Loading...' : 'View Code'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
