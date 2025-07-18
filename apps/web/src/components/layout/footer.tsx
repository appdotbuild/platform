import { Link } from '@tanstack/react-router';
import logo from '~/components/svgs/logo.svg';

function GithubIcon({
  className,
  ...props
}: {
  className?: string;
  [key: string]: any;
}) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clipPath="url(#clip0_17710_208099)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M8 0.203125C3.6 0.203125 0 3.80313 0 8.20312C0 11.7365 2.26667 14.7365 5.46667 15.8031C5.86667 15.8698 6 15.6031 6 15.4031C6 15.2031 6 14.7365 6 14.0698C3.8 14.5365 3.33333 13.0031 3.33333 13.0031C3 12.0698 2.46667 11.8031 2.46667 11.8031C1.66667 11.3365 2.46667 11.3365 2.46667 11.3365C3.26667 11.4031 3.66667 12.1365 3.66667 12.1365C4.4 13.3365 5.53333 13.0031 6 12.8031C6.06667 12.2698 6.26667 11.9365 6.53333 11.7365C4.73333 11.5365 2.86667 10.8698 2.86667 7.80312C2.86667 6.93646 3.2 6.20312 3.66667 5.66979C3.66667 5.40312 3.33333 4.60313 3.8 3.53646C3.8 3.53646 4.46667 3.33646 6 4.33646C6.66667 4.13646 7.33333 4.06979 8 4.06979C8.66667 4.06979 9.33333 4.13646 10 4.33646C11.5333 3.26979 12.2 3.53646 12.2 3.53646C12.6667 4.66979 12.3333 5.46979 12.2667 5.66979C12.8 6.20312 13.0667 6.93646 13.0667 7.80312C13.0667 10.8698 11.2 11.5365 9.4 11.7365C9.66667 12.0031 9.93333 12.4698 9.93333 13.2031C9.93333 14.2698 9.93333 15.1365 9.93333 15.4031C9.93333 15.6031 10.0667 15.8698 10.4667 15.8031C13.6667 14.7365 15.9333 11.7365 15.9333 8.20312C16 3.80313 12.4 0.203125 8 0.203125Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_17710_208099">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

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
