"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

function Avatar({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar"
      className={cn(
        "relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full",
        className,
      )}
      {...props}
    />
  );
}

function AvatarImage({ className, src, alt = "", ...props }: React.ComponentProps<"img">) {
  const [error, setError] = React.useState(false);
  if (!src || error) return null;
  return (
    <img
      data-slot="avatar-image"
      className={cn("aspect-square h-full w-full rounded-full object-cover", className)}
      src={src}
      alt={alt}
      onError={() => setError(true)}
      {...props}
    />
  );
}

function AvatarFallback({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-fallback"
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
