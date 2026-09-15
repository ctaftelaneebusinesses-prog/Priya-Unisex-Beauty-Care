import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "gold";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-ink-950 text-white hover:bg-ink-900 active:bg-ink-950",
  secondary: "bg-white text-ink-900 border border-cream-300 hover:bg-cream-100",
  ghost: "bg-transparent text-ink-700 hover:bg-cream-200",
  danger: "bg-wine-600 text-white hover:bg-wine-500",
  gold: "bg-gold-400 text-ink-950 hover:bg-gold-300 font-semibold",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "text-xs px-3 py-1.5 gap-1.5 rounded-lg",
  md: "text-sm px-4 py-2.5 gap-2 rounded-xl",
  lg: "text-base px-6 py-3.5 gap-2.5 rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  fullWidth,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth && "w-full",
        className
      )}
      disabled={disabled}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
