import { Link } from '@tanstack/react-router';

export function HomePage() {
  return (
    <div
      className="flex h-screen items-center justify-center bg-gray-100"
      style={{ viewTransitionName: 'main-content' }}
    >
      <div className="flex flex-col items-center">
        <h1 className="text-4xl font-bold text-gray-800">
          Welcome to the Home Page
        </h1>
        <Link to="/chat/123" viewTransition={{ types: ['fade-slide'] }}>
          <button
            type="button"
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Go to Chat Page
          </button>
        </Link>
      </div>
    </div>
  );
}
