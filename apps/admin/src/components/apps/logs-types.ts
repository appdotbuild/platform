export type SnapshotFolder = {
  folderName: string;
  fullPath: string;
  traceId: string;
  timestamp: string;
  lastModified?: Date;
};

export type SnapshotFile = {
  fileName: string;
  key: string;
  size: number;
  lastModified: Date;
  contentType?: string;
};

export type SnapshotFileWithUrl = SnapshotFile & {
  presignedUrl?: string;
};
export type SnapshotIteration = {
  folder: string;
  timestamp: string;
  jsonFiles: Record<string, any>;
};

export type TraceSnapshotData = {
  traceId: string;
  iterations: SnapshotIteration[];
  totalIterations: number;
};
export type SnapshotIterationMetadata = {
  iteration: number;
  folderName: string;
  timestamp: string;
  jsonFileCount: number;
  ordinal: string;
};

export type TraceSnapshotMetadata = {
  traceId: string;
  iterations: SnapshotIterationMetadata[];
  totalIterations: number;
};

export type SingleIterationJsonData = {
  traceId: string;
  iteration: number;
  folderName: string;
  timestamp: string;
  jsonFiles: Record<string, any>;
  totalFiles: number;
};
