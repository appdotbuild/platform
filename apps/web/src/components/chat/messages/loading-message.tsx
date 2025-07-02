interface LoadingMessageProps {
  message?: string;
}

export function LoadingMessage({ message = 'Thinking' }: LoadingMessageProps) {
  return (
    <div className="relative border border-gray-200 rounded-lg min-h-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />

      <div className="relative px-4 pt-2 pb-4 bg-gradient-to-br from-gray-50/90 to-white/90">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm text-gray-600">{message}</span>
        </div>

        <div className="w-full border-b border-gray-200 mt-1 mb-4" />

        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-gray-200/50 rounded w-3/4" />
          <div className="h-3 bg-gray-200/50 rounded w-1/2" />
          <div className="h-3 bg-gray-200/50 rounded w-5/6" />
        </div>
      </div>
    </div>
  );
}
