import type { App } from '@appdotbuild/core';
import { STACK_OPTIONS } from '~/components/chat/stack/stack-options';
import { createElement } from 'react';
import {
  ExternalLink,
  GitBranch,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@appdotbuild/design';

interface ChatInfoContentProps {
  app: App | undefined;
  hasLoadedOnce: boolean;
}

export function ChatInfoContent({ app, hasLoadedOnce }: ChatInfoContentProps) {
  const stackOption = app?.techStack
    ? STACK_OPTIONS.find((option) => option.id === app.techStack)
    : null;

  const getDeploymentStatus = () => {
    if (!app?.deployStatus) return null;

    switch (app.deployStatus) {
      case 'deployed':
        return {
          icon: CheckCircle2,
          text: 'Deployed',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          tooltip: 'Your app is live and ready to use',
        };
      case 'deploying':
        return {
          icon: Loader2,
          text: 'Deploying',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          animate: true,
          tooltip:
            'Your app is being deployed. This usually takes 2-3 minutes.',
        };
      case 'failed':
        return {
          icon: XCircle,
          text: 'Failed',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          tooltip:
            'Deployment failed. Try making changes to trigger a new deployment.',
        };
      case 'pending':
        return {
          icon: Clock,
          text: 'Queued',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          tooltip: 'Your app is queued for deployment and will start shortly.',
        };
      default:
        return null;
    }
  };

  const deploymentStatus = getDeploymentStatus();

  return (
    <div key="status" className={hasLoadedOnce ? 'animate-slide-fade-in' : ''}>
      <div className="p-6">
        {/* App Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground mb-1">
              {app?.appName || 'Untitled App'}
            </h2>
            {stackOption && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                {createElement(stackOption.icon, { className: 'w-4 h-4' })}
                <span className="text-sm">{stackOption.name}</span>
              </div>
            )}
          </div>

          {/* Deployment Status Badge */}
          {deploymentStatus && (
            <Tooltip>
              <TooltipTrigger>
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${deploymentStatus.bgColor} ${deploymentStatus.color}`}
                >
                  {createElement(deploymentStatus.icon, {
                    className: `w-3.5 h-3.5 ${
                      deploymentStatus.animate ? 'animate-spin' : ''
                    }`,
                  })}
                  {deploymentStatus.text}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{deploymentStatus.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          {app?.deployStatus === 'deployed' && app?.appUrl && (
            <a
              href={app.appUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Visit App
            </a>
          )}

          {app?.repositoryUrl && (
            <a
              href={app.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-muted/50 hover:bg-muted rounded-lg text-sm font-medium text-foreground transition-colors"
            >
              <GitBranch className="w-4 h-4" />
              <span className="hidden sm:inline">View Code</span>
              <span className="sm:hidden">Code</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
