"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import { tapTabTrigger } from "@/lib/ui/interaction";

const Tabs = TabsPrimitive.Root;

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex h-10 items-center gap-1 rounded-xl bg-surface-1 p-1",
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        tapTabTrigger,
        "inline-flex min-h-10 min-w-[2.75rem] items-center justify-center rounded-lg px-4 py-1.5 text-sm font-medium text-navy-500 transition-all data-[state=active]:bg-card data-[state=active]:text-navy-950 data-[state=active]:shadow-sm active:data-[state=inactive]:bg-surface-2",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content className={cn("mt-4", className)} {...props} />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
