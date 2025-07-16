import { useUser } from '@stackframe/react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { sendIdentify } from '~/external/segment';
import { isChatPage } from '~/utils/router-checker';
import { Footer } from './footer';
import { Header } from './header';

export function Layout({ children }: { children: React.ReactNode }) {
  const user = useUser();
  const previousUser = useRef(user);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const hideFooter = isChatPage(pathname);

  useEffect(() => {
    if (user?.id) {
      sendIdentify(user);
    }
  }, [user?.id]);

  useEffect(() => {
    if (previousUser.current && !user && pathname !== '/') {
      navigate({ to: '/' });
    }
    previousUser.current = user;
  }, [user, pathname, navigate]);

  return (
    <div className="mx-auto flex flex-col h-screen w-5/6 md:w-4/5 gap-2 overflow-hidden">
      <Header />
      <main className="h-screen overflow-y-auto">{children}</main>
      <Footer isHidden={hideFooter} />
    </div>
  );
}
