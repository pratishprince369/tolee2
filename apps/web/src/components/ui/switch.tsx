"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 data-[size=default]:h-[22px] data-[size=default]:w-[42px] data-[size=sm]:h-[16px] data-[size=sm]:w-[28px] data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 transition-colors duration-200 cursor-pointer",
        // Premium high-contrast ON and OFF states
        "data-[checked]:bg-emerald-500 data-[state=checked]:bg-emerald-500",
        "data-[unchecked]:bg-rose-500 data-[state=unchecked]:bg-rose-500 dark:data-[unchecked]:bg-rose-600 dark:data-[state=unchecked]:bg-rose-600",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-md ring-0 transition-transform duration-250 ease-in-out",
          "group-data-[size=default]/switch:h-[18px] group-data-[size=default]/switch:w-[18px]",
          "group-data-[size=sm]/switch:h-[12px] group-data-[size=sm]/switch:w-[12px]",
          "ml-[2px]",
          // Checked state translation (guaranteed to align via standard arbitrary selectors)
          "group-data-[checked]/switch:translate-x-[20px] group-data-[state=checked]/switch:translate-x-[20px]",
          "group-data-[size=sm]/switch:group-data-[checked]/switch:translate-x-[12px]",
          "group-data-[size=sm]/switch:group-data-[state=checked]/switch:translate-x-[12px]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }

