"use client";

import { javascript } from "@codemirror/lang-javascript";
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";

interface CodeEditorProps {
  content: string;
  isLoading?: boolean;
}

export default function CodeEditor({ content, isLoading = false }: CodeEditorProps) {
  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading code...</div>;
  }

  return (
    <CodeMirror
      value={content}
      maxHeight="600px"
      theme={vscodeDark}
      extensions={[javascript({ typescript: true })]}
      readOnly={true}
    />
  );
}
