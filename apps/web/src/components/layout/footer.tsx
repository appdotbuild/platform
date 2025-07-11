interface FooterProps {
  isHidden?: boolean;
}

export function Footer({ isHidden = false }: FooterProps) {
  return (
    <footer
      className={`flex items-center justify-center py-6 px-40 bg-muted border-t border-border ${
        isHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ viewTransitionName: 'footer' }}
    >
      <span className="text-muted-foreground">developed by databricks.com</span>
    </footer>
  );
}
