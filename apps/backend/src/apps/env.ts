import { PROD_AGENT_API_URL, STAGING_AGENT_API_URL } from './constants';

export function getAgentHost() {
  if (process.env.NODE_ENV === 'development') {
    return PROD_AGENT_API_URL;
  }
  return PROD_AGENT_API_URL;
}
