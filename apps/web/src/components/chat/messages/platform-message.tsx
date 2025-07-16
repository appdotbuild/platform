import { PlatformMessageType } from '@appdotbuild/core';
import { LINK_ENABLED_TYPES, URL_REGEX } from './constants';
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

  const messageContent = shouldParseLinks(type)
    ? parseMessageWithLinks(message)
    : message;

  return (
    <div
      className={`group relative border ${borderColor} rounded-lg overflow-hidden ${bgColor}`}
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg">{icon}</span>
          <div className="flex-1">
            <p className="text-sm text-foreground">{messageContent}</p>
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

export const shouldParseLinks = (type?: PlatformMessageType): boolean =>
  LINK_ENABLED_TYPES.includes(type as (typeof LINK_ENABLED_TYPES)[number]);

export const parseMessageWithLinks = (message: string): React.ReactNode => {
  const parts = message.split(URL_REGEX);

  return parts.map((part, index) =>
    URL_REGEX.test(part) ? createLinkElement(part, part, index) : part,
  );
};

const createLinkElement = (url: string, text: string, index: number) => (
  <a
    key={index}
    href={url.startsWith('www.') ? `https://${url}` : url}
    target="_blank"
    rel="noopener noreferrer"
    className="text-blue-600 hover:text-blue-800 underline"
  >
    {text}
  </a>
);
