import type { ButtonHTMLAttributes } from "react";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

interface WorkspacePlusButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label?: string;
  showLabel?: boolean;
  surface?: "default" | "masthead";
}

export function WorkspacePlusButton({
  className,
  label = "Ajouter",
  showLabel = false,
  surface = "default",
  title,
  type = "button",
  ...props
}: WorkspacePlusButtonProps) {
  const isMasthead = surface === "masthead";

  return (
    <button
      type={type}
      title={title ?? label}
      aria-label={props["aria-label"] ?? label}
      className={cn(
        isMasthead ? "app-masthead-add-button" : "workspace-plus-button",
        showLabel
          ? isMasthead
            ? "app-masthead-add-button--label"
            : "workspace-plus-button--label h-[2.15rem] w-auto px-3.5 py-0"
          : isMasthead
            ? "app-masthead-add-button--icon"
            : "h-[2.15rem] w-[2.15rem] p-0",
        className,
      )}
      {...props}
    >
      {showLabel ? <span className={cn(isMasthead && "app-masthead-add-button-label")}>{label}</span> : null}
      <Plus className={cn("h-4.5 w-4.5", isMasthead && "app-masthead-add-button-icon")} />
    </button>
  );
}
