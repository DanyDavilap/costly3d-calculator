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
          {title && <h2 className="text-lg font-semibold text-[color:var(--color-card-text)]">{title}</h2>}
          {subtitle && <p className="text-sm text-[color:var(--color-card-text-muted)]">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
