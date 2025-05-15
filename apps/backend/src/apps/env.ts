import { PROD_AGENT_API_URL, STAGING_AGENT_API_URL } from './constants';
import { isDev } from '../env';
export function getAgentHost() {
  if (isDev) {
    return STAGING_AGENT_API_URL;
  }
  return PROD_AGENT_API_URL;
}
