export type LogFolder = {
  folderName: string;
  fullPath: string;
  traceId: string;
  timestamp: string;
  lastModified?: Date;
};

export type LogFile = {
  fileName: string;
  key: string;
  size: number;
  lastModified: Date;
  contentType?: string;
};

export type LogPresignedUrl = {
  readUrl: string;
  fileName: string;
  expiresIn: number;
};

export type LogFileWithUrl = LogFile & {
  presignedUrl?: string;
};
export type LogIteration = {
  folder: string;
  timestamp: string;
  jsonFiles: Record<string, any>;
};

export type TraceLogData = {
  traceId: string;
  iterations: LogIteration[];
  totalIterations: number;
};
export type LogIterationMetadata = {
  iteration: number;
  folderName: string;
  timestamp: string;
  jsonFileCount: number;
  ordinal: string;
};

export type TraceLogMetadata = {
  traceId: string;
  iterations: LogIterationMetadata[];
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
