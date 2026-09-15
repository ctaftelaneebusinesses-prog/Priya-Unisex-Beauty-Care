import type { ReactNode } from "react";
import { useEffect } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const SIZE_CLASSES: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

export function Modal({ isOpen, onClose, title, subtitle, children, footer, size = "md" }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-950/50 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${SIZE_CLASSES[size]} bg-white rounded-2xl shadow-soft animate-fade-in max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-start justify-between px-6 py-5 border-b border-cream-300">
          <div>
            <h2 className="font-display text-xl text-ink-950">{title}</h2>
            {subtitle && <p className="text-sm text-ink-600 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-ink-600 hover:bg-cream-200 hover:text-ink-950 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-cream-300 flex items-center justify-end gap-3 bg-cream-50 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
