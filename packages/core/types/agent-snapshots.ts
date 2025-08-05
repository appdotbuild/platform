export type AgentSnapshotMetadata = {
  traceId: string;
  iterations: AgentSnapshotIterationMetadata[];
};

export type AgentSnapshotIterationMetadata = {
  iterationNumber: number;
  folderName: string;
  timestamp: string;
  jsonFileCount: number;
};

export type AgentSnapshotFolder = {
  folderName: string;
  fullPath: string;
  traceId: string;
  timestamp: string;
  lastModified?: Date;
};

export type AgentSnapshotIterationJsonData = {
  traceId: string;
  iteration: number;
  folderName: string;
  timestamp: string;
  jsonFiles: Record<string, any>;
  totalFiles: number;
};
