import { UserButton, useUser } from '@stackframe/react';
import { Link, useLocation } from '@tanstack/react-router';
import { isHomePage } from '~/utils/router-checker';

export function Header() {
  const { pathname } = useLocation();
  const user = useUser();
  return (
    <header className="flex w-full items-center py-10 px-40">
      <nav
        className={`flex w-full items-center ${
          isHomePage(pathname) ? 'justify-center' : 'justify-start'
        }`}
      >
        <Link to="/">
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
