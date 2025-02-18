"use client";

import styles from "./source-box.module.css";
import { cn } from "@repo/design/lib/utils";

export type Source = { title: string; url: string; abstract: string; score: number };

export function SourceBox(props: Source) {
  return (
    <div className="group rounded-lg border bg-card text-card-foreground shadow-sm p-4 h-full">
      <div className="flex flex-col justify-between h-full gap-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold line-clamp-2 leading-normal">
            <a href={props.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {props.title}
            </a>
          </h3>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 overflow-hidden mt-auto">{props.abstract}</p>
        <div className="flex items-center justify-between">
          <a
            href={props.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            View source →
          </a>
          <span className="text-sm text-muted-foreground whitespace-nowrap hidden group-hover:block">
            Score: {props.score?.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function SourceBoxList(props: {
  className?: string;
  sources: Source[];
  showMoreUrl?: string;
  maxItems?: number;
}) {
  if (props.sources.length === 0) return null;
  const show = props.maxItems ?? 3;
  let initialShow = show;
  if (props.sources.length === show + 1) {
    initialShow = show + 1;
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const ele = e.currentTarget;
    const startPos = {
      left: ele.scrollLeft,
      x: e.clientX,
    };

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startPos.x;
      ele.scrollLeft = startPos.left - dx;
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      className={`flex flex-nowrap overflow-x-auto gap-2 justify-start w-full min-w-0 cursor-grab active:cursor-grabbing select-none pb-4 ${
        props.className
      }`}
      style={{ WebkitOverflowScrolling: "touch" }}
      onMouseDown={(e) => {
        if (window.innerWidth >= 768) return; // Only enable drag scroll on mobile
        handleMouseDown(e);
      }}
    >
      {props.sources.slice(0, initialShow).map((source, index) => (
        <div
          key={source.url}
          className={cn("flex-none w-64", styles.fadeInUp)}
          style={{
            animationDelay: `${index * 150}ms`,
          }}
        >
          <SourceBox {...source} />
        </div>
      ))}
      {props.sources.length > initialShow && (
        <div
          className={cn("flex-none w-64 h-full", styles.fadeInUp)}
          style={{
            animationDelay: `${initialShow * 150}ms`,
          }}
        >
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 h-full">
            <div className="flex flex-col gap-2 h-full justify-between">
              {props.sources.slice(initialShow, initialShow + 2).map((source) => (
                <div key={source.url} className="flex flex-col first:border-b first:pb-2">
                  <h4 className="font-medium text-sm line-clamp-1">
                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {source.title}
                    </a>
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-1">{source.abstract}</p>
                </div>
              ))}

              <div className="mt-auto pt-1">
                {props.sources.length > initialShow + 2 ? (
                  <a href={props.showMoreUrl} className="text-sm text-primary cursor-pointer">
                    And {props.sources.length - initialShow - 2} more...
                  </a>
                ) : (
                  <p className="text-sm pt-1">&nbsp;</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
