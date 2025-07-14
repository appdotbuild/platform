import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';

interface SimpleCodeViewerProps {
  code: string;
  filename: string;
}

export default function SimpleCodeViewer({
  code,
  filename,
}: SimpleCodeViewerProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm font-medium">
        {filename}
      </div>
      <CodeMirror
        value={code}
        extensions={[javascript({ jsx: true })]}
        theme={vscodeDark}
        readOnly={true}
        height="500px"
      />
    </div>
  );
}
