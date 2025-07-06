export function UserMessage({ message }: { message: string }) {
  return (
    <div className="bg-muted border border-border px-4 pt-2 pb-4 rounded-lg">
      <span className="font-bold text-muted-foreground text-sm"> User </span>
      <div className="w-full border border-b border-border mt-1 mb-4"></div>
      <span className="text-muted-foreground">{message}</span>
    </div>
  );
}
