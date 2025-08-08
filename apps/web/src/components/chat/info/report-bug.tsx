import { Button } from '~/components/shared/button';
import { Bug } from 'lucide-react';
import type { App } from '@appdotbuild/core';
import { UAParser } from 'ua-parser-js';
import { PLATFORM_GITHUB_REPO_URL } from '~/lib/constants';

interface ReportBugProps {
  app: App | undefined;
}

function getBrowserAndOSInfo(): { browser: string; os: string } {
  const parser = new UAParser();
  const result = parser.getResult();

  const browser =
    result.browser.name && result.browser.version
      ? `${result.browser.name} ${result.browser.version}`
      : result.browser.name || 'Unknown';

  const os =
    result.os.name && result.os.version
      ? `${result.os.name} ${result.os.version}`
      : result.os.name || 'Unknown';

  return { browser, os };
}

function createGitHubIssueUrl(app?: App): string {
  const baseUrl = `${PLATFORM_GITHUB_REPO_URL}/issues/new`;
  const { browser, os } = getBrowserAndOSInfo();

  const params = new URLSearchParams({
    template: 'bug_report.yml',
    title: app?.appName
      ? `[Bug]: Issue with app: ${app.appName}`
      : '[Bug]: Platform Issue',
    'app-name': app?.appName || '',
    'app-id': app?.id || '',
    'trace-id': app?.traceId || '',
    'tech-stack': app?.techStack || 'N/A',
    'deploy-status': app?.deployStatus || 'N/A',
    'app-url': app?.appUrl || '',
    repository: app?.repositoryUrl || '',
    browser: browser,
    os: os,
  });

  return `${baseUrl}?${params.toString()}`;
}

export function ReportBug({ app }: ReportBugProps) {
  const issueUrl = createGitHubIssueUrl(app);

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 text-xs text-muted-foreground hover:text-red-500 hover:brightness-95"
      asChild
    >
      <a href={issueUrl} target="_blank" rel="noopener noreferrer">
        <Bug className="w-3 h-3 mr-1" />
        Report Issue
      </a>
    </Button>
  );
}
