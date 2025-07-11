interface ChatInfoContentProps {
  app: any;
  hasLoadedOnce: boolean;
}

export function ChatInfoContent({ app, hasLoadedOnce }: ChatInfoContentProps) {
  return (
    <div key="status" className={hasLoadedOnce ? 'animate-slide-fade-in' : ''}>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">App Name</p>
            <p className="font-medium text-foreground">{app?.appName}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Production URL</p>
            {app?.appUrl ? (
              <a
                href={app.appUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap overflow-hidden text-ellipsis block"
              >
                {app.appUrl}
              </a>
            ) : (
              <p className="font-medium text-foreground">Not available</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Repository</p>
            {app?.repositoryUrl ? (
              <a
                href={app.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap overflow-hidden text-ellipsis block"
              >
                {app.repositoryUrl}
              </a>
            ) : (
              <p className="font-medium text-foreground">Not available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
