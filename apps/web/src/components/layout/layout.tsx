import { useUser } from '@stackframe/react';
import { useLocation } from '@tanstack/react-router';
import { useEffect } from 'react';
import { sendIdentify } from '~/external/segment';
import { isAppPage } from '~/utils/router-checker';
import { Footer } from './footer';
import { Header } from './header';

export function Layout({ children }: { children: React.ReactNode }) {
  const user = useUser();
  const { pathname } = useLocation();
  const hideFooter = isAppPage(pathname);

  useEffect(() => {
    if (user?.id) {
      sendIdentify(user);
    }
  }, [user?.id]);

  return (
    <div className="mx-auto flex flex-col h-screen w-5/6 md:w-4/5 gap-2 overflow-hidden">
      <Header />
      <main className="h-screen overflow-y-auto">{children}</main>
      <Footer isHidden={hideFooter} />
    </div>
  );
}
