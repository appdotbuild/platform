import {
  AssistantHeader,
  CreationHeader,
  ErrorState,
  FileTree,
} from './filesystem-components';
import {
  buildFileTree,
  calculateTotalFiles,
  parseFilesFromMessage,
} from './filesystem-utils';

const FilesystemView = ({ message }: { message: string }) => {
  const files = parseFilesFromMessage(message);
  const tree = buildFileTree(files);
  const totalFiles = calculateTotalFiles(files);

  if (files.length === 0) {
    return <ErrorState />;
  }

  return (
    <>
      <CreationHeader totalFiles={totalFiles} />
      <AssistantHeader />
      <div className="px-3 pb-3 bg-gray-50">
        <FileTree tree={tree} />
      </div>
    </>
  );
};

export function FileSystemMessage({ message }: { message: string }) {
  return <FilesystemView message={message} />;
}
