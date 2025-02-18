"use client"

import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "../../shadcn/button";
import { useState } from "react";

interface ShowHideProps {
  content: string;
  className?: string;
}

export function ShowHide({ content, className = "" }: ShowHideProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-1">
      <div className="group">
        <p className={`transition-all duration-200 ${!expanded ? "line-clamp-1" : "break-all"} ${className}`}>
          {content}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <div className="flex items-center gap-1">
              Show less <ChevronUp className="h-3 w-3" />
            </div>
          ) : (
            <div className="flex items-center gap-1">
              Show more <ChevronDown className="h-3 w-3" />
            </div>
          )}
        </Button>
      </div>
    </div>
  );
} 