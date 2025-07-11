import { APP_TEMPLATE_INFO, type AppTemplate } from '@appdotbuild/core';
import { useState } from 'react';
import { cn } from '~/lib/utils';

interface RequestMessageProps {
  onSubmit: (name: string, template: AppTemplate) => void | Promise<void>;
}

const templates = Object.entries(APP_TEMPLATE_INFO).map(([value, info]) => ({
  value: value as AppTemplate,
  ...info,
}));

export function RequestMessage({ onSubmit }: RequestMessageProps) {
  const [appName, setAppName] = useState('');
  const [template, setTemplate] = useState<AppTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = appName.trim();
    if (name && template && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await onSubmit(name, template);
      } catch (_) {
        setIsSubmitting(false);
      }
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
            Let's create your app. What would you like to name it?
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="My Awesome App"
                className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all text-foreground placeholder:text-muted-foreground"
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {templates.map((t) => (
                <label key={t.value} className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="template"
                    value={t.value}
                    checked={template === t.value}
                    onChange={(e) =>
                      setTemplate(e.target.value as typeof t.value)
                    }
                    className="sr-only peer"
                    disabled={isSubmitting}
                  />
                  <div
                    className={cn(
                      'flex flex-col items-center p-4 rounded-lg border-2 transition-all',
                      'bg-background hover:bg-muted/30',
                      'border-input peer-checked:border-foreground',
                      'peer-checked:bg-muted/50 peer-checked:shadow-sm',
                      'group',
                    )}
                  >
                    <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">
                      {t.icon}
                    </span>
                    <div className="text-center">
                      <div className="font-medium text-foreground">
                        {t.label}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {t.description}
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <button
              type="submit"
              disabled={!appName.trim() || !template || isSubmitting}
              className={cn(
                'w-full px-4 py-3 rounded-lg font-medium transition-all',
                'bg-foreground text-background',
                'hover:bg-foreground/90 active:scale-[0.98]',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
              )}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <title>Loading</title>
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating your app...
                </span>
              ) : (
                'Create App'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
