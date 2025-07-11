export function ChatLoading() {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 animate-pulse mt-10">
      <div className="space-y-3">
        <div className="h-4 bg-muted rounded w-3/4"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
      </div>

      <div className="space-y-3">
        <div className="h-4 bg-muted rounded w-5/6"></div>
        <div className="h-4 bg-muted rounded w-2/3"></div>
        <div className="h-4 bg-muted rounded w-1/3"></div>
      </div>

      <div className="space-y-3">
        <div className="h-4 bg-muted rounded w-2/3"></div>
      </div>

      <div className="space-y-3">
        <div className="h-4 bg-muted rounded w-full"></div>
        <div className="h-4 bg-muted rounded w-4/5"></div>
        <div className="h-4 bg-muted rounded w-3/5"></div>
        <div className="h-4 bg-muted rounded w-2/5"></div>
      </div>
    </div>
  );
}
