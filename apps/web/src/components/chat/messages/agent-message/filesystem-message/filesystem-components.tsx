import { useState } from 'react';
import { getFileIcon, type TreeNode } from './utils';

export const ErrorState = () => (
  <div className="mt-3 p-4 border border-red-200 rounded-lg bg-red-50">
    <span className="text-sm text-red-600">No files found in message</span>
  </div>
);

export const FileIcon = ({
  name,
  additionalCount,
}: {
  name: string;
  additionalCount?: number;
}) => (
  <div className="flex items-center gap-1">
    <span className="text-sm">{getFileIcon(name)}</span>
    <span className="text-sm font-medium text-foreground">{name}</span>
    {additionalCount && (
      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-1">
        +{additionalCount} more
      </span>
    )}
  </div>
);

export const DirectoryIcon = ({ name }: { name: string }) => (
  <div className="flex items-center gap-1">
    <span className="text-sm">📁</span>
    <span className="text-sm font-medium text-foreground">{name}</span>
  </div>
);

export const ExpandIcon = ({ isExpanded }: { isExpanded: boolean }) => (
  <span className="text-xs text-muted-foreground w-3 flex justify-center">
    {isExpanded ? '▼' : '▶'}
  </span>
);

export const TreeNodeComponent = ({
  name,
  node,
  level = 0,
}: {
  name: string;
  node: TreeNode;
  level?: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const isDirectory = node.type === 'directory';
  const hasChildren = isDirectory && Object.keys(node.children).length > 0;

  const handleClick = () => {
    if (isDirectory) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="select-none">
      <button
        type="button"
        className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
        onClick={handleClick}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onKeyDown={handleClick}
      >
        {isDirectory && hasChildren && <ExpandIcon isExpanded={isExpanded} />}
        {!isDirectory && <span className="w-3" />}

        {isDirectory ? (
          <DirectoryIcon name={name} />
        ) : (
          <FileIcon name={name} additionalCount={node.additionalCount} />
        )}
      </button>

      {isDirectory && hasChildren && isExpanded && (
        <div>
          {Object.entries(node.children).map(([childName, childNode]) => (
            <TreeNodeComponent
              key={childName}
              name={childName}
              node={childNode}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileTree = ({ tree }: { tree: Record<string, TreeNode> }) => (
  <div className="bg-background rounded border border-border p-2">
    {Object.entries(tree).map(([name, node]) => (
      <TreeNodeComponent key={name} name={name} node={node} />
    ))}
  </div>
);
