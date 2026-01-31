import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export default function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    variant === "primary"
      ? "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-strong)]"
      : "border border-slate-200 text-slate-700 hover:bg-slate-50";

  return (
    <button
      className={`rounded-full px-5 py-2 text-sm font-semibold transition ${base} ${className}`}
      {...props}
    />
  );
}
