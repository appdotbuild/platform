import { GetAuthorizationTokenCommand } from '@aws-sdk/client-ecr';
import { ecrClient } from './client';

export async function getECRCredentials() {
  const command = new GetAuthorizationTokenCommand({});
  const response = await ecrClient.send(command);

  const authData = response.authorizationData?.[0];
  if (!authData || !authData.authorizationToken) {
    throw new Error('Failed to get auth token.');
  }

  const decoded = Buffer.from(authData.authorizationToken, 'base64').toString();
  const [username, password] = decoded.split(':');

  const registryUrl = authData.proxyEndpoint;

  if (!username || !password || !registryUrl) {
    throw new Error('Failed to get auth token.');
  }

  return { username, password, registryUrl };
}
