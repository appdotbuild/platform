import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import multiavatar from '@multiavatar/multiavatar/esm';

import { cn } from '@design/lib/utils';

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        'relative flex size-8 shrink-0 overflow-hidden rounded-full',
        className,
      )}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn('aspect-square size-full', className)}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        'bg-muted flex size-full items-center justify-center rounded-full',
        className,
      )}
      {...props}
    />
  );
}

function HashAvatar({ hash }: { hash: string }) {
  let svgCode = multiavatar(hash);
  return (
    <div className="size-8" dangerouslySetInnerHTML={{ __html: svgCode }} />
  );
}

export { Avatar, AvatarImage, AvatarFallback, HashAvatar };
