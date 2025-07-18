import { Link } from '@tanstack/react-router';
import { Button } from '~/components/shared/button';
import githubIcon from '~/components/svgs/github-white-logo.svg';
import logo from '~/components/svgs/logo.svg';

export function PublicHeader() {
  return (
    <header className="absolute left-0 right-0 z-50 h-[52px] top-0">
      <nav
        className="mx-auto flex h-full w-full max-w-[1216px] items-center justify-between px-5 md:px-8"
        aria-label="Global"
      >
        <Link to="/">
          <img
            className="max-w-[110px] lg:max-w-none"
            src={logo}
            width={112}
            height={21}
            alt=""
          />
          <span className="sr-only">app.build</span>
        </Link>
        <div className="hidden items-center gap-x-6 lg:flex">
          <Link
            to="/blog"
            className="text-sm font-medium transition-colors text-muted-foreground hover:text-secondary-foreground active:text-foreground"
            style={{ letterSpacing: '-0.025em' }}
          >
            Blog
          </Link>
          <Button variant="secondary" size="sm" asChild>
            <Link
              to="https://github.com/appdotbuild/platform"
              target="_blank"
              className="inline-flex items-center justify-center gap-1 font-medium"
            >
              <img
                className="w-3"
                src={githubIcon}
                width={16}
                height={16}
                alt=""
              />
              GitHub
            </Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
