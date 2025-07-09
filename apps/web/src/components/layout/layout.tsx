import { Header } from './header';
import { Footer } from './footer';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex flex-col h-screen w-5/6 md:w-4/5 gap-2 overflow-hidden">
      <Header />
      <main className="h-screen overflow-y-auto">{children}</main>
      <Footer />
    </div>
  );
}
