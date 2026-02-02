import { useMemo, useState } from "react";
import { wikiGroups, defaultWikiSectionId } from "../data/wikiSections";
import { getWikiContent } from "../data/wikiIndex";
import WikiSidebar from "./WikiSidebar";
import WikiContent from "./WikiContent";

type WikiLayoutProps = {
  isProEnabled: boolean;
  onUnlockPro: () => void;
};

export default function WikiLayout({ isProEnabled, onUnlockPro }: WikiLayoutProps) {
  const [activeId, setActiveId] = useState(defaultWikiSectionId);

  const activeSection = useMemo(() => {
    for (const group of wikiGroups) {
      const found = group.sections.find((section) => section.id === activeId);
      if (found) return found;
    }
    return wikiGroups[0]?.sections[0];
  }, [activeId]);

  const content = activeSection ? getWikiContent(activeSection.id) : "";

  return (
    <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
      <WikiSidebar groups={wikiGroups} activeId={activeId} onSelect={setActiveId} />
      <WikiContent
        title={activeSection?.title ?? "Wiki"}
        markdown={content}
        isProSection={activeSection?.isPro ?? false}
        isProEnabled={isProEnabled}
        onUnlockPro={onUnlockPro}
      />
    </div>
  );
}
