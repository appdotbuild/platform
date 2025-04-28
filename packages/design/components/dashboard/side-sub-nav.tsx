import { cn } from '../../lib/utils';
import { Home } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

export interface SideSubNavProps {
  pages: { title: string; to: string; icon }[];
  activePage: string;
}

export function SideSubNav({
  pages = [{ title: 'Dashboard', to: '/dashboard', icon: Home }],
  activePage,
}: SideSubNavProps) {
  return (
    <nav
      className="grid gap-4 text-sm text-muted-foreground"
      x-chunk="dashboard-04-chunk-0"
    >
      {pages.map((page) => (
        <Link
          key={page.to}
          href={page.to}
          className={cn(
            activePage === page.to ? 'text-primary font-semibold' : '',
            'justify-start flex items-center',
          )}
        >
          <span className="mr-2 w-4 h-4">
            {React.createElement(page.icon, { size: 16 })}
          </span>
          {page.title}
        </Link>
      ))}
    </nav>
  );
}
