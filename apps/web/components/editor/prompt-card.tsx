import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@repo/ui/button";

interface PromptCardProps extends Omit<
  ComponentProps<"li">,
  "title" | "onClick"
> {
  icon?: LucideIcon;
  title: string;
  description: string;
  disabled?: boolean;
  expanded?: boolean;
  highlighted?: boolean;
  onClick: () => void;
  // Shown under the header when the card opens into a form
  children?: ReactNode;
}

export function PromptCard({
  icon: Icon,
  title,
  description,
  disabled,
  expanded,
  highlighted,
  onClick,
  children,
  className = "",
  ...props
}: PromptCardProps) {
  return (
    <li
      {...props}
      className={`relative grid content-start rounded-md border bg-card text-card-foreground ${
        children ? "@sm:col-span-2" : ""
      } ${highlighted ? "ring-2 ring-ring" : ""} ${className}`}
    >
      <Button
        type="button"
        variant="ghost"
        disabled={disabled}
        aria-expanded={expanded}
        onClick={onClick}
        className="h-auto w-full flex-col items-start justify-start gap-1 p-3 text-left whitespace-normal"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          {Icon ? <Icon className="text-muted-foreground" aria-hidden /> : null}
          {title}
        </span>
        <span className="text-xs font-normal text-muted-foreground">
          {description}
        </span>
      </Button>
      {children ? <div className="border-t p-3">{children}</div> : null}
    </li>
  );
}
