export function Sidebar({ children }: { children: React.ReactNode }) {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 overflow-hidden border-r bg-background">
      <div className="h-full">{children}</div>
    </aside>
  );
}
