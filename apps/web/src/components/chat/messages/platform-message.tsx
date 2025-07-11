import { PlatformMessageType } from '@appdotbuild/core';
import { MessageDetails } from './message-details';

interface PlatformMessageProps {
  message: string;
  type?: PlatformMessageType;
  rawData?: any;
}

const PLATFORM_MESSAGE_ICONS: Record<PlatformMessageType, string> = {
  [PlatformMessageType.REPO_CREATED]: '📁',
  [PlatformMessageType.COMMIT_CREATED]: '✅',
  [PlatformMessageType.DEPLOYMENT_IN_PROGRESS]: '🚀',
  [PlatformMessageType.DEPLOYMENT_COMPLETE]: '✅',
  [PlatformMessageType.DEPLOYMENT_STOPPING]: '🛑',
  [PlatformMessageType.DEPLOYMENT_FAILED]: '❌',
} as const;

const PLATFORM_MESSAGE_BORDER_COLORS = {
  [PlatformMessageType.REPO_CREATED]: 'border-green-200',
  [PlatformMessageType.COMMIT_CREATED]: 'border-green-200',
  [PlatformMessageType.DEPLOYMENT_IN_PROGRESS]: 'border-purple-200',
  [PlatformMessageType.DEPLOYMENT_COMPLETE]: 'border-green-200',
  [PlatformMessageType.DEPLOYMENT_STOPPING]: 'border-yellow-200',
  [PlatformMessageType.DEPLOYMENT_FAILED]: 'border-red-200',
} as const;

const PLATFORM_MESSAGE_BG_COLORS = {
  [PlatformMessageType.REPO_CREATED]: 'bg-green-50/50',
  [PlatformMessageType.COMMIT_CREATED]: 'bg-green-50/50',
  [PlatformMessageType.DEPLOYMENT_IN_PROGRESS]: 'bg-purple-50/50',
  [PlatformMessageType.DEPLOYMENT_COMPLETE]: 'bg-green-50/50',
  [PlatformMessageType.DEPLOYMENT_STOPPING]: 'bg-yellow-50/50',
  [PlatformMessageType.DEPLOYMENT_FAILED]: 'bg-red-50/50',
} as const;

export function PlatformMessage({
  message,
  type,
  rawData,
}: PlatformMessageProps) {
  const icon = PLATFORM_MESSAGE_ICONS[type as PlatformMessageType] || 'ℹ️';
  const borderColor =
    PLATFORM_MESSAGE_BORDER_COLORS[type as PlatformMessageType] ||
    'border-border';
  const bgColor =
    PLATFORM_MESSAGE_BG_COLORS[type as PlatformMessageType] || 'bg-muted/50';

  return (
    <div
      className={`group relative border ${borderColor} rounded-lg overflow-hidden ${bgColor}`}
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg">{icon}</span>
          <div className="flex-1">
            <p className="text-sm text-foreground">{message}</p>
            {rawData && (
              <MessageDetails
                rawData={rawData}
                label="Show platform message details"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
