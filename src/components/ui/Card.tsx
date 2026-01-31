import type { PropsWithChildren } from "react";

type CardProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  className?: string;
}>;

export default function Card({ title, subtitle, className = "", children }: CardProps) {
  return (
    <section className={`card px-6 py-5 ${className}`}>
      {(title || subtitle) && (
        <header className="mb-4">
          {title && <h2 className="text-lg font-semibold text-slate-900">{title}</h2>}
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
