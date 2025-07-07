import {
  Card,
  CardContent,
  CardHeader,
  CardHeadline,
} from '~/components/shared/card';
import { ErrorState, FileTree } from './filesystem-components';
import {
  buildFileTree,
  calculateTotalFiles,
  parseFilesFromMessage,
} from './utils';

export function FileSystemMessage({ message }: { message: string }) {
  const files = parseFilesFromMessage(message);
  const tree = buildFileTree(files);
  const totalFiles = calculateTotalFiles(files);

  if (files.length === 0) {
    return <ErrorState />;
  }

  return (
    <Card>
      <CardHeadline
        icon="✨"
        text={`Created ${totalFiles} files`}
        variant="success"
      />
      <CardHeader icon="🤖" title="Assistant" />
      <CardContent className="bg-muted/50">
        <FileTree tree={tree} />
      </CardContent>
    </Card>
  );
}
