interface LoadingMessageProps {
  message?: string;
  options?: { collapsed?: boolean };
}

export function LoadingMessage({
  message = 'Thinking',
  options,
}: LoadingMessageProps) {
  const isCollapsed = options?.collapsed;

  return (
    <div
      className={`relative border border-gray-200 rounded-lg overflow-hidden transition-all duration-500 ease-out ${
        isCollapsed ? 'h-14' : 'min-h-28'
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />

      <div
        className={`relative px-4 bg-gradient-to-br from-gray-50/90 to-white/90 transition-all duration-500 ease-out ${
          isCollapsed ? 'py-4 flex justify-center items-center' : 'pt-2 pb-4'
        }`}
      >
        <div className="flex items-center gap-2">
          {isCollapsed && (
            <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          )}

          <span className="font-bold text-sm text-gray-600">
            {!isCollapsed ? message : 'Still working...'}
          </span>
        </div>

        <div
          className={`transition-all duration-500 ease-out overflow-hidden ${
            isCollapsed
              ? 'max-h-0 opacity-0 mt-0 scale-95'
              : 'max-h-32 opacity-100 mt-2 scale-100'
          }`}
          style={{
            transitionDelay: isCollapsed ? '0ms' : '100ms',
            transitionProperty: 'max-height, opacity, margin-top, transform',
          }}
        >
          <div className="w-full border-b border-gray-200 mt-1 mb-4" />
          <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-gray-200/50 rounded w-3/4" />
            <div className="h-3 bg-gray-200/50 rounded w-1/2" />
            <div className="h-3 bg-gray-200/50 rounded w-5/6" />
          </div>
        </div>
      </div>
    </div>
  );
}
