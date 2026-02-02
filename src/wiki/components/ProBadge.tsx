type ProBadgeProps = {
  size?: "sm" | "md";
};

export default function ProBadge({ size = "sm" }: ProBadgeProps) {
  const padding = size === "md" ? "px-3 py-1 text-[10px]" : "px-2 py-0.5 text-[9px]";
  return (
    <span className={`inline-flex rounded-full bg-slate-900 text-white font-semibold tracking-wide ${padding}`}>
      PRO
    </span>
  );
}
