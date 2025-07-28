import { Link } from '@tanstack/react-router';

interface FooterProps {
  isHidden?: boolean;
}

export function Footer({ isHidden = false }: FooterProps) {
  return (
    <footer
      className={`relative border-t border-gray-200 ${
        isHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ viewTransitionName: 'footer' }}
    >
      <div className="container relative mx-auto flex max-w-[1216px] items-center justify-center px-4 pt-4 pb-8">
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
      </div>
    </footer>
  );
}
