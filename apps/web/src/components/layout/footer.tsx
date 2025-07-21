import { GithubIcon } from '../shared/icons/github-icon';
import { Link } from '@tanstack/react-router';
import logo from '~/components/assets/svgs/logo.svg';

interface FooterProps {
  isHidden?: boolean;
}

export function Footer({ isHidden = false }: FooterProps) {
  const socialLinks = [
    {
      icon: GithubIcon,
      link: 'https://github.com/appdotbuild',
      title: 'GitHub',
    },
  ];

  return (
    <footer
      className={`relative border-t border-gray-200 ${
        isHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ viewTransitionName: 'footer' }}
    >
      <div className="container relative mx-auto flex max-w-[1216px] flex-col items-start justify-between gap-9 px-5 pt-5 pb-6 md:flex-row md:items-center md:px-8 md:pt-6">
        <Link to="/" className="-m-2 block p-2">
          <img src={logo} width={112} height={21} alt="app.build" />
          <span className="sr-only">app.build</span>
        </Link>

        <p className="text-sm font-medium text-foreground md:absolute md:left-1/2 md:-translate-x-1/2">
          Built by{' '}
          <Link
            to="https://databricks.com"
            target="_blank"
            className="underline hover:text-foreground/80 transition-colors"
            rel="noopener noreferrer"
          >
            Databricks
          </Link>
        </p>

        <nav className="flex grow items-center gap-5 md:justify-end">
          {socialLinks.map(({ link, icon: Icon, title }, index) => (
            <Link
              to={link}
              key={index}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-foreground/80 transition-colors"
              title={title}
            >
              <Icon className="size-4" />
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
