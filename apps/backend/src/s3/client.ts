import { S3Client } from '@aws-sdk/client-s3';

export const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID_AGENT!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_AGENT!,
  },
  region: process.env.AWS_REGION_AGENT,
});

export function getAgentSnapshotsBucketName() {
  return process.env.AWS_BUCKET_NAME_AGENT!;
}
