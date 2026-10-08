import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

/** The design's `.tag`: small tinted labels from the terracotta, sage and sand ramps. */
const tagVariants = cva("inline-flex items-center gap-1.5 rounded-xl px-2.5 py-[3px] text-[11px] font-semibold tracking-[0.02em] whitespace-nowrap", {
  variants: {
    tone: {
      accent: "bg-terra-100 text-terra-800",
      sage: "bg-sage-100 text-sage-800",
      neutral: "bg-sand-100 text-sand-800",
      outline: "border border-primary text-primary",
      danger: "bg-terra-200 text-terra-900",
      "solid-sage": "bg-sage-700 text-sand-100",
      "solid-dark": "bg-terra-800 text-terra-100",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof tagVariants> {}

export function Tag({ className, tone, ...props }: TagProps) {
  return <span className={cn(tagVariants({ tone }), className)} {...props} />;
}
