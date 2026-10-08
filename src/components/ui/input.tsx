import * as React from "react";
import { cn } from "@/lib/utils";

const field =
  "w-full min-h-10 rounded-full border border-border bg-surface px-4 text-sm text-foreground caret-primary placeholder:text-muted-foreground/70 hover:border-foreground/45 focus-visible:border-primary focus-visible:outline-offset-0 disabled:opacity-45";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => <input ref={ref} type={type} className={cn(field, className)} {...props} />,
);
Input.displayName = "Input";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(field, "min-h-24 rounded-[20px] py-2.5 resize-y", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

export { Input, Textarea };
