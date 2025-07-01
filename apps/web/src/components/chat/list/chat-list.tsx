import { Suspense, useState } from 'react';
import { useApps } from '~/hooks/useApps';

export function ChatList() {
  const [isOpen, setIsOpen] = useState(false);

  const { apps } = useApps();

  return (
    <div className="w-full max-w-4xl mx-auto">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-16 border border-gray-300 rounded-lg bg-white text-black flex justify-between items-center px-6 hover:bg-gray-50 transition-colors duration-200 shadow-sm group"
      >
        <div className="flex items-center gap-3">
          <svg
            className="w-6 h-6 text-gray-600 group-hover:text-gray-800 transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <title>apps</title>
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
          <span className="text-medium font-medium">My Apps</span>
        </div>
        <svg
          className={`w-5 h-5 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <title>arrow down</title>
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      <div
        className={`mt-2 rounded-lg bg-white shadow-sm overflow-hidden transition-all duration-300 ease-in-out border ${
          isOpen
            ? 'max-h-96 opacity-100 border-gray-300'
            : 'max-h-0 opacity-0 border-transparent'
        }`}
      >
        <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300">
          <Suspense
            fallback={
              <div className="p-4 text-gray-500 text-center">
                Loading your apps...
              </div>
            }
          >
            {apps && apps.length === 0 && (
              <ul>
                <li className="p-4 text-gray-500 text-center">
                  You have no apps yet. Start building your first app!
                </li>
              </ul>
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
