import { Footer } from './footer';
import { Header } from './header';
import { useUser } from '@stackframe/react';
import { useLocation } from '@tanstack/react-router';
import { useEffect } from 'react';
import { sendIdentify } from '~/external/segment';
import { isAppPage } from '~/utils/router-checker';
import { cn } from '~/lib/utils';
import { useLayout } from '~/hooks/useLayout';

export function Layout({ children }: { children: React.ReactNode }) {
  const user = useUser();
  const { pathname } = useLocation();
  const hideFooter = isAppPage(pathname);
  const isHomePage = pathname === '/';
  const isPublicHome = isHomePage && !user;
  const { mxAuto } = useLayout();

  useEffect(() => {
    if (user?.id) {
      sendIdentify(user);
    }
  }, [user?.id]);

  const content = (
    <>
      <Header />
      <main
        className={cn('flex-1 flex flex-col overflow-y-auto', {
          'mt-[52px]': !isPublicHome && isHomePage,
        })}
      >
        {children}
      </main>
      <Footer isHidden={hideFooter} />
    </>
  );

  if (isPublicHome) {
    return content;
  }

  return (
    <div
      className={cn(
        'flex flex-col h-screen w-5/6 md:w-4/5 gap-2 overflow-x-hidden',
        {
          'mx-auto': mxAuto,
        },
      )}
    >
      {content}
    </div>
  );
}
