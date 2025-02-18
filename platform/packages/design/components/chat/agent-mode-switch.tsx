import { Switch } from "@repo/design/shadcn/switch";
import { useChatConfig } from "./chat-config-provider";
import { BotMessageSquareIcon, SearchIcon } from "lucide-react";
import { cn } from "@repo/design/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@repo/design/shadcn/tooltip";

export const AgentModeSwitch = () => {
  const { agentMode, setAgentMode } = useChatConfig();

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="h-full flex items-center gap-2 mb-[14px] mr-2">
            <Switch
              id="agent-mode"
              className="transition-opacity ease-in"
              checked={agentMode}
              onCheckedChange={setAgentMode}
            />

            <label
              htmlFor="agent-mode"
              className={cn("text-sm cursor-pointer", agentMode ? "text-foreground" : "text-muted-foreground")}
              onClick={() => setAgentMode(!agentMode)}
            >
              <BotMessageSquareIcon />
            </label>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Enable Multi-tools Agentic mode</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
