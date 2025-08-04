import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@appdotbuild/design';
import { Button } from '@appdotbuild/design';
import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useRecordContext } from 'ra-core';
import { createGrafanaLink } from '@/components/apps/apps-utils';

interface IdCellProps {
  source: string;
  label?: string;
  maxLength?: number;
  showGrafanaLink?: boolean;
}

export function IdCell({
  source,
  label = 'ID',
  maxLength = 36,
  showGrafanaLink = false,
}: IdCellProps) {
  const record = useRecordContext();
  if (!record) return null;

  const id = record[source] as string;
  if (!id) return null;

  const truncatedId = (() => {
    if (id.length <= maxLength) return id;

    // Show beginning and end with ellipsis in middle
    const partLength = Math.floor((maxLength - 3) / 2);
    const start = id.substring(0, partLength);
    const end = id.substring(id.length - partLength);
    return `${start}...${end}`;
  })();

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(id);
      toast.success(`${label} copied to clipboard`);
    } catch (err) {
      console.error(`Failed to copy ${label.toLowerCase()}:`, err);
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const grafanaUrl =
    showGrafanaLink && id
      ? createGrafanaLink(id, record.updatedAt as string)
      : null;

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help font-mono text-xs bg-muted px-2 py-1 rounded border">
              {truncatedId}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-mono">{id}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => void handleCopy(e)}
              className="h-6 w-6 p-0"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Copy {label.toLowerCase()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {grafanaUrl && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" asChild className="h-6 w-6 p-0">
                <a
                  href={grafanaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View logs in Grafana</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
