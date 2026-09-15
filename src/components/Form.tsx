import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import clsx from "clsx";

export function FormField({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink-800">
        {label}
        {required && <span className="text-wine-600 ml-0.5">*</span>}
      </span>
      {children}
      {hint && !error && <span className="text-xs text-ink-600">{hint}</span>}
      {error && <span className="text-xs text-wine-600 font-medium">{error}</span>}
    </label>
  );
}

const fieldBase =
  "w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm text-ink-950 placeholder:text-ink-600/50 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-400/40";

export function Input({ className, error, ...rest }: InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      className={clsx(fieldBase, error ? "border-wine-500" : "border-cream-300 focus:border-gold-400", className)}
      {...rest}
    />
  );
}

export function Select({
  className,
  error,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <select
      className={clsx(fieldBase, "cursor-pointer", error ? "border-wine-500" : "border-cream-300 focus:border-gold-400", className)}
      {...rest}
    >
      {children}
    </select>
  );
}

export function TextArea({
  className,
  error,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return (
    <textarea
      className={clsx(fieldBase, "resize-none", error ? "border-wine-500" : "border-cream-300 focus:border-gold-400", className)}
      {...rest}
    />
  );
}
