import {
  type PlatformMessageMetadata,
  PlatformMessageType,
} from '@appdotbuild/core';
import {
  PLATFORM_MESSAGE_BG_COLORS,
  PLATFORM_MESSAGE_BORDER_COLORS,
  PLATFORM_MESSAGE_ICONS,
  PLATFORM_MESSAGE_LINK_TEXTS,
  PLATFORM_MESSAGE_TEXTS,
} from './constants';

interface GitMessageProps {
  message: string;
  type?: PlatformMessageType;
  metadata?: PlatformMessageMetadata;
}

export function GitMessage({ message, type, metadata }: GitMessageProps) {
  const icon = PLATFORM_MESSAGE_ICONS[type as PlatformMessageType] || 'ℹ️';
  const borderColor =
    PLATFORM_MESSAGE_BORDER_COLORS[type as PlatformMessageType] ||
    'border-border';
  const bgColor =
    PLATFORM_MESSAGE_BG_COLORS[type as PlatformMessageType] || 'bg-muted/50';

  const linkText =
    type && type in PLATFORM_MESSAGE_LINK_TEXTS
      ? PLATFORM_MESSAGE_LINK_TEXTS[
          type as keyof typeof PLATFORM_MESSAGE_LINK_TEXTS
        ]
      : undefined;

  const displayMessage =
    type && type in PLATFORM_MESSAGE_TEXTS
      ? PLATFORM_MESSAGE_TEXTS[type as keyof typeof PLATFORM_MESSAGE_TEXTS]
      : message;

  return (
    <div
      className={`group relative border ${borderColor} rounded-lg overflow-hidden ${bgColor}`}
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg">{icon}</span>
          <div className="flex-1">
            <p className="text-sm text-foreground">
              {displayMessage}{' '}
              {linkText && type && (
                <Link url={getLinkUrl(type, metadata)}>{linkText}</Link>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const Link = ({ url, children }: { url?: string; children: string }) =>
  url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-500 hover:text-blue-800"
    >
      {children}
    </a>
  ) : null;

const getLinkUrl = (
  type: PlatformMessageType,
  metadata?: PlatformMessageMetadata,
): string | undefined => {
  switch (type) {
    case PlatformMessageType.REPO_CREATED:
      return metadata?.githubUrl;
    case PlatformMessageType.COMMIT_CREATED:
      return metadata?.commitUrl;
    default:
      return undefined;
  }
};
