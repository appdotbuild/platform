import { ECRClient } from '@aws-sdk/client-ecr';

const region = process.env.AWS_REGION;

export const ecrClient = new ECRClient({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
