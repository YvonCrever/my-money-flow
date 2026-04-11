import type { ReactNode } from "react";
import { createPortal } from "react-dom";

interface ToolbarPortalProps {
  target: HTMLElement | null;
  children: ReactNode;
}

export function ToolbarPortal({ target, children }: ToolbarPortalProps) {
  if (!target) return null;

  return createPortal(children, target);
}
