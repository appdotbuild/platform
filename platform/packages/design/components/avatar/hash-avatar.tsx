import multiavatar from "@multiavatar/multiavatar/esm";
import { Avatar } from "@repo/design/shadcn/avatar";

export function HashAvatar({ hash }: { hash: string }) {
  let svgCode = multiavatar(hash);
  return (
    <div className="size-8" dangerouslySetInnerHTML={{ __html: svgCode }} />
  );
}
