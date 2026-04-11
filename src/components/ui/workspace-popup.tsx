import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface WorkspacePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function WorkspacePopup({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  bodyClassName,
}: WorkspacePopupProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "workspace-popup max-h-[88vh] max-w-[min(92vw,36rem)] overflow-hidden rounded-[2rem] border-border/70 bg-[linear-gradient(180deg,hsl(var(--background))/0.985,hsl(var(--background))/0.95)] p-0 shadow-[0_32px_90px_hsl(var(--background)/0.45)] backdrop-blur-xl",
          className,
        )}
      >
        <div className="workspace-popup-frame flex max-h-[88vh] flex-col overflow-hidden">
          <div className="workspace-popup-header border-b border-border/70 bg-background/70 px-6 py-5">
            <DialogHeader className="gap-1 text-left">
              <DialogTitle className="text-xl font-semibold text-foreground">{title}</DialogTitle>
              {description ? (
                <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                  {description}
                </DialogDescription>
              ) : null}
            </DialogHeader>
          </div>

          <div className={cn("workspace-popup-body overflow-y-auto px-6 py-5", bodyClassName)}>
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
