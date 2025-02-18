"use client";

import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAssistantRuntime,
  useMessage,
  useThread,
} from "@assistant-ui/react";
import type { FC } from "react";
import { useState, useCallback } from "react";
import React from "react";

import { cn } from "@repo/design/lib/utils";
import { Avatar, AvatarFallback } from "@repo/design/shadcn/avatar";
import { Button } from "@repo/design/shadcn/button";
import {
  ArrowDownIcon,
  CheckIcon,
  ChevronLeftIcon,
  CopyIcon,
  SendHorizontalIcon,
  ChevronRightIcon,
  RefreshCwIcon,
  PencilIcon,
} from "lucide-react";
import Image from "next/image";
import { useChatConfig } from "../chat-config-provider";
import { MarkdownText } from "./markdown-text";
import { TooltipIconButton } from "./tooltip-icon-button";
import { useChatProvider } from "../chat-provider";
import { SourceBoxListStory } from "../source-box.stories";
import { Source, SourceBoxList } from "../source-box";
import { Skeleton } from "@repo/design/shadcn/skeleton";
import { SearchResults } from "../search-results";
import { useDebounce } from "use-debounce";

export const MyThread: FC = () => {
  const { threads } = useAssistantRuntime();
  const { modalMode } = useChatConfig();
  const [hideWelcome, setHideWelcome] = useState(false);

  const doHideWelcome = modalMode && hideWelcome;

  return (
    <ThreadPrimitive.Root
      className={cn(
        "bg-background h-full w-full min-h-[0] transition-all duration-700 ease-in-out",
        doHideWelcome && "min-h-[100dvh]",
        modalMode && "pt-4 pb-8"
      )}
    >
      <ThreadPrimitive.Viewport className="flex h-full flex-col items-center overflow-y-scroll scroll-smooth bg-inherit px-4">
        <div className={cn(doHideWelcome && "invisible", !modalMode && "pt-8")}>
          <MyThreadWelcome hideWelcome={doHideWelcome} />
        </div>

        <ThreadPrimitive.Messages
          components={{
            UserMessage: MyUserMessage,
            EditComposer: MyEditComposer,
            AssistantMessage: MyAssistantMessage,
          }}
        />

        <div className="min-h-8 flex-grow" />

        <div className="sticky bottom-0 mt-3 flex w-full max-w-4xl flex-col items-center justify-end rounded-t-lg bg-inherit pb-4">
          <MyThreadScrollToBottom />
          <ThreadPrimitive.If empty={false}>
            <ThreadPrimitive.If running={false}>
              <Button variant="outline" className="mb-4" onClick={() => threads.switchToNewThread()}>
                Start new chat
              </Button>
            </ThreadPrimitive.If>
          </ThreadPrimitive.If>
          <MyComposer setActive={setHideWelcome} />
          <MySuggestedPromptsInitial />
          <MySuggestedPrompts />
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const MySuggestedPromptsInitial: FC = () => {
  const chatConfig = useChatConfig();
  return (
    <ThreadPrimitive.If empty={true}>
      {chatConfig.suggestedQueries && (
        <div className="mt-4 text-center">
          {chatConfig.suggestedQueries.map((query) => (
            <ThreadPrimitive.Suggestion prompt={query} method="replace" autoSend asChild key={query}>
              <Button variant="outline" className="flex-1 py-1 md:py-2 mr-2 mb-2">
                {query}
              </Button>
            </ThreadPrimitive.Suggestion>
          ))}
        </div>
      )}
    </ThreadPrimitive.If>
  );
};

const MySuggestedPrompts: FC = () => {
  const lastMessage = useThread((t) => t.messages.at(-1));
  const annotation: any = lastMessage?.metadata?.unstable_annotations?.find((a: any) => a.type === "suggested-prompts");
  const suggestions = annotation?.data;
  if (!suggestions) return null;
  return (
    <div className="mt-4 text-center">
      {suggestions.map((query) => (
        <ThreadPrimitive.Suggestion prompt={query} method="replace" autoSend asChild key={query}>
          <Button variant="outline" className="flex-1 py-1 md:py-2 mr-2 mb-2">
            {query}
          </Button>
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
  );
};

const MyThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="absolute -top-8 rounded-full disabled:invisible"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const MyThreadWelcome: FC<{ hideWelcome: boolean }> = ({ hideWelcome }) => {
  const chatConfig = useChatConfig();

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center transition-all duration-300 ease-in-out",
        hideWelcome ? "max-h-0 mb-0 opacity-0 scale-95 pointer-events-none" : "max-h-[200px] mb-8 opacity-100 scale-100"
      )}
    >
      <div className="flex flex-col items-center">
        {chatConfig.logoUrl && <Image src={chatConfig.logoUrl} alt="Logo" width={40} height={40} />}
        {!chatConfig.logoUrl && (
          <Avatar>
            <AvatarFallback>C</AvatarFallback>
          </Avatar>
        )}
        <p className="mt-4 font-medium">{chatConfig.welcomeMessage || "What do you want to know?"}</p>
      </div>
    </div>
  );
};

interface MyComposerProps {
  setActive: (focus: boolean) => void;
}

export const MyComposer: FC<MyComposerProps> = ({ setActive }) => {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  // NB: searchValue is used only for the search results, the AI chat stores internally in ComposerPrimitive.Input
  const [searchValue, setSearchValue] = useState("");
  const [debouncedValue] = useDebounce(searchValue, 200);

  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch("/chat/ui/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    }
  }, []);

  // Effect to trigger search when debounced value changes
  React.useEffect(() => {
    handleSearch(debouncedValue);
  }, [debouncedValue, handleSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSearchValue(e.target.value);
    setActive(true);
  };

  const handleSubmit = () => {
    setSearchResults([]);
    setSearchValue("");
  };

  return (
    <>
      <ComposerPrimitive.Root className="focus-within:border-aui-ring/20 flex w-full flex-wrap items-end rounded-lg border bg-inherit px-2.5 shadow-sm transition-colors ease-in">
        <ComposerPrimitive.Input
          autoFocus
          placeholder="Ask a question or search"
          rows={1}
          onChange={handleInputChange}
          onClick={() => setActive(true)}
          className="placeholder:text-muted-foreground max-h-40 flex-grow resize-none border-none bg-transparent px-2 py-4 text-sm outline-none focus:ring-0 disabled:cursor-not-allowed"
        />
        <ThreadPrimitive.If running={false}>
          <ComposerPrimitive.Send asChild onClick={handleSubmit}>
            <TooltipIconButton
              tooltip="Send"
              variant="default"
              className="my-2.5 size-8 p-2 transition-opacity ease-in"
            >
              <SendHorizontalIcon />
            </TooltipIconButton>
          </ComposerPrimitive.Send>
        </ThreadPrimitive.If>
        <ThreadPrimitive.If running>
          <ComposerPrimitive.Cancel asChild>
            <TooltipIconButton
              tooltip="Cancel"
              variant="default"
              className="my-2.5 size-8 p-2 transition-opacity ease-in"
            >
              <CircleStopIcon />
            </TooltipIconButton>
          </ComposerPrimitive.Cancel>
        </ThreadPrimitive.If>
      </ComposerPrimitive.Root>
      <ThreadPrimitive.If empty>
        {searchValue && searchResults.length > 0 && (
          <>
            <div className="w-full text-sm text-muted-foreground mt-2 ml-6 flex items-center">
              Submit to ask AI
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M15.5 9.00001V15H8.5M8.5 15L9.5 14M8.5 15L9.5 16M13 5H17.5C18.0523 5 18.5 5.44772 18.5 6V18C18.5 18.5523 18.0523 19 17.5 19H6.5C5.94772 19 5.5 18.5523 5.5 18V12C5.5 11.4477 5.94772 11 6.5 11H12V6C12 5.44771 12.4477 5 13 5Z"
                  stroke="#464455"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </>
        )}
        <SearchResults results={searchResults} />
      </ThreadPrimitive.If>
    </>
  );
};

const MyUserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="grid w-full max-w-4xl auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 py-4">
      <MyUserActionBar />

      <div className="bg-muted text-foreground col-start-2 row-start-1 break-words rounded-3xl px-5 py-2.5">
        <MessagePrimitive.Content />
      </div>

      <MyBranchPicker className="col-span-full col-start-1 row-start-2 -mr-1 justify-end" />
    </MessagePrimitive.Root>
  );
};

const MyUserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="col-start-1 mr-3 mt-2.5 flex flex-col items-end"
    >
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip="Edit">
          <PencilIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const MyEditComposer: FC = () => {
  return (
    <ComposerPrimitive.Root className="bg-muted my-4 flex w-full max-w-2xl flex-col gap-2 rounded-xl">
      <ComposerPrimitive.Input className="text-foreground flex h-8 w-full resize-none border-none bg-transparent p-4 pb-0 outline-none focus:ring-0" />

      <div className="mx-3 mb-3 flex items-center justify-center gap-2 self-end">
        <ComposerPrimitive.Cancel asChild>
          <Button variant="ghost">Cancel</Button>
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send asChild>
          <Button>Send</Button>
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  );
};

const MyAssistantMessage: FC = () => {
  const message = useMessage();
  const annotation: any = message?.metadata?.unstable_annotations?.find((a: any) => a.type === "sources");
  const sources = annotation?.data;

  // Show skeleton loading state when message is empty
  if (!message?.content?.length && !annotation) {
    return (
      <div className="relative grid w-full max-w-4xl grid-cols-[auto_auto_1fr] grid-rows-[auto_1fr] py-4">
        <Avatar className="col-start-1 row-span-full row-start-1 mr-4">
          <AvatarFallback>AI</AvatarFallback>
        </Avatar>
        <div className="col-span-2 col-start-2 space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative grid w-full max-w-4xl grid-cols-[auto_auto_1fr] grid-rows-[auto_1fr] py-4">
      <Avatar className="col-start-1 row-span-full row-start-1 mr-4">
        <AvatarFallback>AI</AvatarFallback>
      </Avatar>

      <div className="text-foreground col-span-2 col-start-2 row-start-1 my-1.5 break-words leading-7">
        {annotation && <SourceBoxList sources={sources} />}
      </div>
      <MessagePrimitive.Root>
        <div className="text-foreground col-span-2 col-start-2 row-start-1 my-1.5 break-words leading-7">
          <MessagePrimitive.Content components={{ Text: MarkdownText }} />
        </div>

        <MyAssistantActionBar />

        <MyBranchPicker className="col-start-2 row-start-2 -ml-2 mr-2" />
      </MessagePrimitive.Root>
    </div>
  );
};

const MyAssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
      className="text-muted-foreground data-[floating]:bg-background col-start-3 row-start-2 -ml-1 flex gap-1 data-[floating]:absolute data-[floating]:rounded-md data-[floating]:border data-[floating]:p-1 data-[floating]:shadow-sm"
    >
      {/* <MessagePrimitive.If speaking={false}>
        <ActionBarPrimitive.Speak asChild>
          <TooltipIconButton tooltip="Read aloud">
            <AudioLinesIcon />
          </TooltipIconButton>
        </ActionBarPrimitive.Speak>
      </MessagePrimitive.If>
      <MessagePrimitive.If speaking>
        <ActionBarPrimitive.StopSpeaking asChild>
          <TooltipIconButton tooltip="Stop">
            <StopCircleIcon />
          </TooltipIconButton>
        </ActionBarPrimitive.StopSpeaking>
      </MessagePrimitive.If>*/}
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copy">
          <MessagePrimitive.If copied>
            <CheckIcon />
          </MessagePrimitive.If>
          <MessagePrimitive.If copied={false}>
            <CopyIcon />
          </MessagePrimitive.If>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip="Refresh">
          <RefreshCwIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
    </ActionBarPrimitive.Root>
  );
};

const MyBranchPicker: FC<any> = ({ className, ...rest }) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn("text-muted-foreground inline-flex items-center text-xs", className)}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next">
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};

const CircleStopIcon = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <rect width="10" height="10" x="3" y="3" rx="2" />
    </svg>
  );
};
