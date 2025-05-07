export function getS3DirectoryParams(appId: string) {
  const key = `apps/${appId}/source_code.zip`;
  const baseParams = {
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: key,
  };
  return baseParams;
}
