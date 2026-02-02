import ProBadge from "./ProBadge";

type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "separator" }
  | { type: "quote"; text: string };

const parseMarkdown = (markdown: string): MarkdownBlock[] => {
  const lines = markdown.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let buffer: string[] = [];
  let listBuffer: string[] = [];

  const flushParagraph = () => {
    if (buffer.length === 0) return;
    const text = buffer.join(" ").trim();
    if (text) {
      blocks.push({ type: "paragraph", text });
    }
    buffer = [];
  };

  const flushList = () => {
    if (listBuffer.length === 0) return;
    blocks.push({ type: "list", items: [...listBuffer] });
    listBuffer = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    if (trimmed === "---") {
      flushParagraph();
      flushList();
      blocks.push({ type: "separator" });
      return;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length as 1 | 2 | 3;
      blocks.push({ type: "heading", level, text: headingMatch[2] });
      return;
    }

    const quoteMatch = trimmed.match(/^>\s?(.+)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      blocks.push({ type: "quote", text: quoteMatch[1] });
      return;
    }

    const listMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      listBuffer.push(listMatch[1]);
      return;
    }

    buffer.push(trimmed);
  });

  flushParagraph();
  flushList();

  return blocks;
};

type WikiContentProps = {
  title: string;
  markdown: string;
  isProSection?: boolean;
  isProEnabled: boolean;
  onUnlockPro: () => void;
};

export default function WikiContent({
  title,
  markdown,
  isProSection = false,
  isProEnabled,
  onUnlockPro,
}: WikiContentProps) {
  const blocks = parseMarkdown(markdown);
  const isLocked = isProSection && !isProEnabled;
  const previewBlocks = isLocked ? blocks.slice(0, 4) : blocks;

  return (
    <section className="relative rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        {isProSection && <ProBadge size="md" />}
      </div>
      <div className={`space-y-4 text-sm text-gray-700 ${isLocked ? "max-h-[360px] overflow-hidden" : ""}`}>
        {previewBlocks.length === 0 && (
          <p className="text-sm text-gray-500">Contenido pendiente de carga.</p>
        )}
        {previewBlocks.map((block, index) => {
          if (block.type === "heading") {
            const className =
              block.level === 1
                ? "text-xl font-semibold text-gray-800"
                : block.level === 2
                  ? "text-lg font-semibold text-gray-800"
                  : "text-base font-semibold text-gray-800";
            return (
              <h3 key={`${block.type}-${index}`} className={className}>
                {block.text}
              </h3>
            );
          }
          if (block.type === "paragraph") {
            return (
              <p key={`${block.type}-${index}`} className="leading-relaxed">
                {block.text}
              </p>
            );
          }
          if (block.type === "list") {
            return (
              <ul key={`${block.type}-${index}`} className="list-disc pl-5 space-y-1 text-gray-600">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
          }
          if (block.type === "separator") {
            return <hr key={`${block.type}-${index}`} className="border-gray-200" />;
          }
          if (block.type === "quote") {
            return (
              <div
                key={`${block.type}-${index}`}
                className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-blue-700"
              >
                {block.text}
              </div>
            );
          }
          return null;
        })}
      </div>

      {isLocked && (
        <div className="absolute inset-0 flex items-end justify-center rounded-3xl bg-gradient-to-t from-white via-white/90 to-transparent p-8">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-lg">
            <p className="text-sm font-semibold text-gray-800">Desbloqueá este contenido PRO</p>
            <p className="mt-2 text-xs text-gray-500">
              Accedé a prácticas avanzadas, métricas profesionales y guías de negocio 3D.
            </p>
            <button
              type="button"
              onClick={onUnlockPro}
              className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              Desbloquear PRO
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
