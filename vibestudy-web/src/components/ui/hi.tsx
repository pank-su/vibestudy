import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { cn } from "@/lib/utils";

export function Hi({
  icon,
  size = 18,
  strokeWidth = 1.5,
  className,
}: {
  icon: IconSvgElement;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={strokeWidth}
      color="currentColor"
      className={cn("inline-flex shrink-0", className)}
      aria-hidden
    />
  );
}
