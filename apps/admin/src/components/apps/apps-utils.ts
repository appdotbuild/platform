import { GRAFANA_BASE_URL, KOYEB_BASE_URL, NEON_BASE_URL } from '@/urls';

/**
 * Creates a Grafana link for viewing logs filtered by trace ID with smart time range
 * @param traceId - The trace ID to filter logs by
 * @param updatedAt - ISO timestamp to calculate time range around
 * @returns Grafana URL or null if invalid inputs
 */
export function createGrafanaLink(
  traceId: string,
  updatedAt: string,
): string | null {
  if (!traceId || !updatedAt) return null;

  try {
    // Calculate time range: 30 minutes before and after updatedAt
    const updatedTime = new Date(updatedAt);
    const fromTime = new Date(updatedTime.getTime() - 30 * 60 * 1000); // 30 min before
    const toTime = new Date(updatedTime.getTime() + 30 * 60 * 1000); // 30 min after

    const baseUrl = `${GRAFANA_BASE_URL}/explore/service/appdotbuild/logs`;
    const params = new URLSearchParams({
      patterns: '[]',
      from: fromTime.toISOString(),
      to: toTime.toISOString(),
      'var-lineFormat': '',
      'var-ds': 'grafanacloud-logs',
      'var-filters': 'service_name|=|appdotbuild',
      'var-fields': '',
      'var-levels': '',
      'var-metadata': '',
      'var-jsonFields': '',
      'var-patterns': '',
      'var-lineFilterV2': '',
      'var-lineFilters': `caseInsensitive,0|__gfp__=|${traceId}`,
      timezone: 'utc',
      'var-all-fields': '',
      displayedFields: '[]',
      tableLogLineState: '"text"',
      urlColumns: '["Time","Line"]',
      visualizationType: '"logs"',
      sortOrder: '"Descending"',
      prettifyLogMessage: 'false',
      wrapLogMessage: 'false',
    });

    return `${baseUrl}?${params.toString()}`;
  } catch (error) {
    console.error('Failed to create Grafana link:', error);
    return null;
  }
}

/**
 * Creates a Koyeb service console link
 * @param serviceId - The Koyeb service ID
 * @returns Koyeb console URL or null if invalid input
 */
export function createKoyebServiceLink(serviceId: string): string | null {
  if (!serviceId) return null;
  return `${KOYEB_BASE_URL}/${serviceId}`;
}

/**
 * Creates a Neon project console link
 * @param projectId - The Neon project ID
 * @returns Neon console URL or null if invalid input
 */
export function createNeonProjectLink(projectId: string): string | null {
  if (!projectId) return null;
  return `${NEON_BASE_URL}/${projectId}`;
}

/**
 * Creates an app URL link (direct link to deployed application)
 * @param appUrl - The application URL
 * @returns App URL or null if invalid input
 */
export function createAppLink(appUrl: string): string | null {
  if (!appUrl) return null;

  // Ensure URL has protocol
  if (!appUrl.startsWith('http://') && !appUrl.startsWith('https://')) {
    return `https://${appUrl}`;
  }

  return appUrl;
}

/**
 * Creates a repository link (GitHub, GitLab, etc.)
 * @param repositoryUrl - The repository URL
 * @returns Repository URL or null if invalid input
 */
export function createRepositoryLink(repositoryUrl: string): string | null {
  if (!repositoryUrl) return null;

  // Ensure URL has protocol
  if (
    !repositoryUrl.startsWith('http://') &&
    !repositoryUrl.startsWith('https://')
  ) {
    return `https://${repositoryUrl}`;
  }

  return repositoryUrl;
}
