import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import * as React from "react";
import { cn } from "@/lib/utils";

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => <RadioGroupPrimitive.Root ref={ref} className={cn("grid gap-3", className)} {...props} />);
RadioGroup.displayName = "RadioGroup";

/** A radio with the design's `.dot` (accent fill ringed by the page colour when checked). */
const RadioItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & { label: React.ReactNode; description?: React.ReactNode }
>(({ className, label, description, id, ...props }, ref) => {
  const autoId = React.useId();
  const itemId = id ?? autoId;
  return (
    <div className="flex items-start gap-3">
      <RadioGroupPrimitive.Item
        ref={ref}
        id={itemId}
        className={cn(
          "mt-0.5 size-4 shrink-0 rounded-full border-[1.5px] border-border hover:border-primary data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:shadow-[inset_0_0_0_4px_var(--color-bg)]",
          className,
        )}
        {...props}
      />
      <label htmlFor={itemId} className="cursor-pointer text-sm leading-snug">
        <span className="font-semibold">{label}</span>
        {description ? <span className="mt-0.5 block text-foreground/75">{description}</span> : null}
      </label>
    </div>
  );
});
RadioItem.displayName = "RadioItem";

export { RadioGroup, RadioItem };
