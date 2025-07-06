import { useState } from 'react';

interface RequestMessageProps {
  onSubmit: (name: string) => void;
}

// @TODO - Refactor to generic component with more options
export function RequestMessage({ onSubmit }: RequestMessageProps) {
  const [appName, setAppName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = appName.trim();
    if (name && !isSubmitting) {
      setIsSubmitting(true);
      onSubmit(name);
    }
  };

  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
        <span className="text-sm">🤖</span>
      </div>
      <div className="flex-1">
        <div className="bg-muted/50 rounded-lg p-4 border border-border">
          <p className="text-foreground mb-4">
            To get started, I need to know what to call your app. What would you
            like to name it?
          </p>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="e.g. My Awesome App"
              className="flex-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              disabled={isSubmitting}
              autoFocus
            />
            <button
              type="submit"
              disabled={!appName.trim() || isSubmitting}
              className="px-4 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create App'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
