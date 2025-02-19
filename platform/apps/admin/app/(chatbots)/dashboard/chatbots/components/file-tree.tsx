"use client";

import { ChevronRight, ChevronDown, File, Folder } from "lucide-react";
import { cn } from "@repo/design/lib/utils";

interface FileEntry {
  path: string;
  content: string;
  type: "file" | "directory";
  children?: FileEntry[];
}

interface FileTreeProps {
  files: FileEntry[];
  selectedFile: string;
  onSelectFile: (path: string, content: string) => void;
  className?: string;
}

export function FileTree({
  files,
  selectedFile,
  onSelectFile,
  className,
}: FileTreeProps) {
  const renderNode = (node: FileEntry, level: number = 0) => {
    const isSelected = node.path === selectedFile;
    const isDirectory = node.type === "directory";

    return (
      <div key={node.path} style={{ marginLeft: `${level * 16}px` }}>
        <button
          onClick={() => {
            if (!isDirectory) {
              onSelectFile(node.path, node.content);
            }
          }}
          className={cn(
            "flex items-center gap-2 w-full px-2 py-1 hover:bg-accent rounded-sm text-sm",
            isSelected && "bg-accent",
            "text-left",
          )}
        >
          {isDirectory ? (
            <>
              <ChevronRight className="h-4 w-4" />
              <Folder className="h-4 w-4" />
            </>
          ) : (
            <>
              <File className="h-4 w-4" />
            </>
          )}
          {node.path.split("/").pop()}
        </button>
        {isDirectory &&
          node.children?.map((child) => renderNode(child, level + 1))}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "min-w-[200px] max-w-[300px] max-h-[600px] border-r overflow-auto",
        className,
      )}
    >
      <div className="p-2">{files.map((file) => renderNode(file))}</div>
    </div>
  );
}
