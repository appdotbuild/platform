import { PlatformMessageType } from '@appdotbuild/core';
import { MessageDetails } from './message-details';

interface PlatformMessageProps {
  message: string;
  type?: PlatformMessageType;
  rawData?: any;
}

export function PlatformMessage({
  message,
  type,
  rawData,
}: PlatformMessageProps) {
  const getIcon = () => {
    switch (type) {
      case PlatformMessageType.REPO_CREATED:
        return '📁';
      case PlatformMessageType.COMMIT_CREATED:
        return '✅';
      case PlatformMessageType.DEPLOYMENT_IN_PROGRESS:
        return '🚀';
      default:
        return 'ℹ️';
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case PlatformMessageType.REPO_CREATED:
        return 'border-green-200';
      case PlatformMessageType.COMMIT_CREATED:
        return 'border-green-200';
      case PlatformMessageType.DEPLOYMENT_IN_PROGRESS:
        return 'border-purple-200';
      default:
        return 'border-border';
    }
  };

  const getBgColor = () => {
    switch (type) {
      case PlatformMessageType.REPO_CREATED:
        return 'bg-green-50/50';
      case PlatformMessageType.COMMIT_CREATED:
        return 'bg-green-50/50';
      case PlatformMessageType.DEPLOYMENT_IN_PROGRESS:
        return 'bg-purple-50/50';
      default:
        return 'bg-muted/50';
    }
  };

  return (
    <div
      className={`group relative border ${getBorderColor()} rounded-lg overflow-hidden ${getBgColor()}`}
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg">{getIcon()}</span>
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
