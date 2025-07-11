import { useLocation } from '@tanstack/react-router';
import { isChatPage } from '~/utils/router-checker';
import { Footer } from './footer';
import { Header } from './header';

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const hideFooter = isChatPage(pathname);

  return (
    <div className="mx-auto flex flex-col h-screen w-5/6 md:w-4/5 gap-2 overflow-hidden">
      <Header />
      <main className="h-screen overflow-y-auto">{children}</main>
      <Footer isHidden={hideFooter} />
    </div>
  );
}
