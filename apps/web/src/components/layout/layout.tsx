import { Header } from './header';
import { Footer } from './footer';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen gap-20">
      <Header />

      <main className="flex-1 overflow-hidden">{children}</main>
      <Footer />
    </div>
  );
}
