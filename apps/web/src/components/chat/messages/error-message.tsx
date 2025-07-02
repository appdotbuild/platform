import { MessageDetails } from './message-details';

interface ErrorMessageProps {
  message: string;
  rawData?: any;
}

export function ErrorMessage({ rawData }: ErrorMessageProps) {
  return (
    <div className="group relative border border-red-200 rounded-lg overflow-hidden hover:border-red-300 transition-colors">
      <div className="px-4 py-2 bg-red-50 border-b border-red-200">
        <span className="text-xs font-medium text-red-800">Error occurred</span>
      </div>

      <div className="w-full border-t border-red-100" />

      <div className="px-4 py-3">
        <div className="text-sm text-red-700">
          Something went wrong. Please try again later.
        </div>

        <div className="flex items-center gap-3">
          {rawData && (
            <MessageDetails rawData={rawData} label="Show detailed" />
          )}
        </div>
      </div>
    </div>
  );
}
