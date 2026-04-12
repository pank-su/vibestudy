import { Group, Panel, Separator, usePanelRef, useGroupRef } from "react-resizable-panels";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type GroupProps = ComponentProps<typeof Group>;
type PanelProps = ComponentProps<typeof Panel>;
type SeparatorProps = ComponentProps<typeof Separator>;

function ResizablePanelGroup({ className, ...props }: GroupProps) {
  return <Group className={cn("h-full w-full", className)} {...props} />;
}

function ResizablePanel({ className, ...props }: PanelProps) {
  return <Panel className={className} {...props} />;
}

interface ResizableHandleProps extends SeparatorProps {
  withHandle?: boolean;
}

function ResizableHandle({ className, withHandle = true, ...props }: ResizableHandleProps) {
  return (
    <Separator
      className={cn("resizable-handle", className)}
      {...props}
    >
      {withHandle && <span className="resizable-pill" />}
    </Separator>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle, usePanelRef, useGroupRef };
