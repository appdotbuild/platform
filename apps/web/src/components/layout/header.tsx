import { UserButton, useUser } from '@stackframe/react';
import { Link } from '@tanstack/react-router';

export function Header() {
  const user = useUser();
  return (
    <header className="flex w-full items-center py-4 lg:py-10">
      <nav className="flex w-full items-center justify-start">
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
      </nav>
      {user && <UserButton />}
    </header>
  );
}
