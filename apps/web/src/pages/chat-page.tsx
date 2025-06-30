import { Link } from '@tanstack/react-router';

export function ChatPage() {
  return (
    <div
      className="flex flex-col h-full"
      style={{ viewTransitionName: 'chat-container' }}
    >
      <div className="flex-1 overflow-y-auto p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Chat Page</h1>
        <p className="text-gray-600 mb-4">This is the chat interface.</p>
        <Link to="/" viewTransition={{ types: ['fade-slide'] }}>
          <button
            type="button"
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Back to Home
          </button>
        </Link>
      </div>
    </div>
  );
}
