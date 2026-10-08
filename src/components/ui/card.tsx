import * as React from "react";
import { cn } from "@/lib/utils";

/** The design's `.card`: a surface-filled, very rounded container. */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { tone?: "surface" | "plain" | "accent" | "sage" }>(
  ({ className, tone = "surface", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[32px] p-6",
        tone === "surface" && "bg-surface",
        tone === "plain" && "bg-background",
        tone === "accent" && "bg-terra-200",
        tone === "sage" && "bg-sage-200",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";
