import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={variant === "danger" ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        {variant === "danger" && (
          <div className="shrink-0 w-10 h-10 rounded-full bg-wine-50 text-wine-600 flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
        )}
        <p className="text-sm text-ink-700 leading-relaxed">{message}</p>
      </div>
    </Modal>
  );
}
