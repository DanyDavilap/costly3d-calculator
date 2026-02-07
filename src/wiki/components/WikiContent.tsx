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
};

export default function WikiContent({ title, markdown }: WikiContentProps) {
  const blocks = parseMarkdown(markdown);

  return (
    <section className="relative rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
      </div>
      <div className="space-y-4 text-sm text-gray-700">
        {blocks.length === 0 && <p className="text-sm text-gray-500">Contenido pendiente de carga.</p>}
        {blocks.map((block, index) => {
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
    </section>
  );
}
