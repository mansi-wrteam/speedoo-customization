import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border-2 border-[var(--checkbox-unchecked-border)] bg-[var(--checkbox-unchecked-background)] shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand-border-default)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[var(--checkbox-checked-background)] data-[state=checked]:border-[var(--checkbox-checked-border)] data-[state=checked]:text-[var(--checkbox-checked-icon)]",
      className
    )}
    {...props}>
    <CheckboxPrimitive.Indicator className={cn("flex h-full w-full items-center justify-center text-current")}>
      <Check className="h-2.5 w-2.5" strokeWidth={4} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
