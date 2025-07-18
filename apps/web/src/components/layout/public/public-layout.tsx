import { Footer } from '../footer';
import { PublicHeader } from './public-header';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <>
      <PublicHeader />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
    </>
  );
}
