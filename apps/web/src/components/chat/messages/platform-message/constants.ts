import { PlatformMessageType } from '@appdotbuild/core';

export const PLATFORM_MESSAGE_ICONS: Record<PlatformMessageType, string> = {
  [PlatformMessageType.REPO_CREATED]: '📁',
  [PlatformMessageType.COMMIT_CREATED]: '✅',
  [PlatformMessageType.DEPLOYMENT_IN_PROGRESS]: '🚀',
  [PlatformMessageType.DEPLOYMENT_COMPLETE]: '✅',
  [PlatformMessageType.DEPLOYMENT_STOPPING]: '🛑',
  [PlatformMessageType.DEPLOYMENT_FAILED]: '❌',
} as const;

export const PLATFORM_MESSAGE_BORDER_COLORS = {
  [PlatformMessageType.REPO_CREATED]: 'border-green-200',
  [PlatformMessageType.COMMIT_CREATED]: 'border-green-200',
  [PlatformMessageType.DEPLOYMENT_IN_PROGRESS]: 'border-purple-200',
  [PlatformMessageType.DEPLOYMENT_COMPLETE]: 'border-green-200',
  [PlatformMessageType.DEPLOYMENT_STOPPING]: 'border-yellow-200',
  [PlatformMessageType.DEPLOYMENT_FAILED]: 'border-red-200',
} as const;

export const PLATFORM_MESSAGE_BG_COLORS = {
  [PlatformMessageType.REPO_CREATED]: 'bg-green-50/50',
  [PlatformMessageType.COMMIT_CREATED]: 'bg-green-50/50',
  [PlatformMessageType.DEPLOYMENT_IN_PROGRESS]: 'bg-purple-50/50',
  [PlatformMessageType.DEPLOYMENT_COMPLETE]: 'bg-green-50/50',
  [PlatformMessageType.DEPLOYMENT_STOPPING]: 'bg-yellow-50/50',
  [PlatformMessageType.DEPLOYMENT_FAILED]: 'bg-red-50/50',
} as const;

export const PLATFORM_MESSAGE_LINK_TEXTS = {
  [PlatformMessageType.REPO_CREATED]: 'View repository',
  [PlatformMessageType.COMMIT_CREATED]: 'View commit',
  [PlatformMessageType.DEPLOYMENT_IN_PROGRESS]: 'View deployment',
  [PlatformMessageType.DEPLOYMENT_COMPLETE]: 'View deployment',
} as const;

export const PLATFORM_MESSAGE_TEXTS = {
  [PlatformMessageType.REPO_CREATED]:
    'Your application has been uploaded to GitHub:',
  [PlatformMessageType.COMMIT_CREATED]:
    'Changes have been committed to your repository:',
  [PlatformMessageType.DEPLOYMENT_IN_PROGRESS]:
    'Your application is being deployed:',
  [PlatformMessageType.DEPLOYMENT_COMPLETE]:
    'Your application has been deployed successfully:',
  [PlatformMessageType.DEPLOYMENT_FAILED]: 'Could not verify deployment status',
  [PlatformMessageType.DEPLOYMENT_STOPPING]:
    'Your application is being stopped',
} as const;
