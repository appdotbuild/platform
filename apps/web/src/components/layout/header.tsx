import { UserButton, useUser } from '@stackframe/react';
import { Link } from '@tanstack/react-router';

export function Header() {
  const user = useUser();

  return (
    <header className="absolute left-0 right-0 z-50 h-[52px] top-2">
      <nav
        className="mx-auto flex h-full w-full max-w-[1216px] items-center justify-between px-5 md:px-8"
        aria-label="Global"
      >
        <Link to="/" replace>
          <img
            src="https://www.app.build/_next/static/media/ca7edce715379528b2fbeb326c96cf7b.svg"
            width="112"
            height="21"
            alt="app.build logo"
            style={{ viewTransitionName: 'logo' }}
            className="cursor-pointer transition-transform duration-200 hover:scale-105"
          />
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="https://app.build/blog"
            className="text-sm font-medium transition-colors text-muted-foreground hover:text-secondary-foreground active:text-foreground"
            style={{ letterSpacing: '-0.025em' }}
          >
            Blog
          </Link>
          <a
            href="https://github.com/appdotbuild"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            title="View on GitHub"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <title>github</title>
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
          {user && <UserButton />}
        </div>
      </nav>
    </header>
  );
}
