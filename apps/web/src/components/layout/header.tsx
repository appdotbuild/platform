import { Link, useLocation } from '@tanstack/react-router';

export function Header() {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  return (
    <header
      className="flex w-full items-center py-10 px-40"
      style={{ viewTransitionName: 'header' }}
    >
      <nav
        className={`flex w-full items-center ${
          isHome ? 'justify-center' : 'justify-start'
        }`}
      >
        <Link to="/" viewTransition={{ types: ['header-move'] }}>
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
    </header>
  );
}
