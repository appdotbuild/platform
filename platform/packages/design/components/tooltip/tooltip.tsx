import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/design/shadcn/tooltip";

export function EasyTooltip({
  children,
  tooltip,
  duration = 0,
}: {
  children: React.ReactNode;
  tooltip: React.ReactNode;
  duration?: number;
}) {
  if (!tooltip) {
    return children;
  }
  if (typeof children === "string") {
    children = <span>{children}</span>;
  }

  return (
    <TooltipProvider delayDuration={duration}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
