import { useEffect, useMemo, useState } from "react";
import { wikiGroups, defaultWikiSectionId } from "../data/wikiSections";
import { loadWikiContent } from "../data/wikiIndex";
import WikiSidebar from "./WikiSidebar";
import WikiContent from "./WikiContent";
import { isBeta } from "../../utils/appMode";

type WikiLayoutProps = {
  isProEnabled: boolean;
  onUnlockPro: () => void;
};

export default function WikiLayout({ isProEnabled, onUnlockPro }: WikiLayoutProps) {
  const isBetaApp = isBeta();
  const availableGroups = useMemo(() => {
    if (!isBetaApp) return wikiGroups;
    const mindsetSection = wikiGroups.flatMap((group) => group.sections).find((section) => section.id === "mindset");
    if (!mindsetSection) return [];
    return [
      {
        id: "beta",
        title: "Wiki",
        sections: [{ ...mindsetSection, isPro: false }],
      },
    ];
  }, [isBetaApp]);
  const initialSectionId = useMemo(
    () => availableGroups[0]?.sections[0]?.id ?? defaultWikiSectionId,
    [availableGroups],
  );
  const [activeId, setActiveId] = useState(() => initialSectionId);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const activeSection = useMemo(() => {
    for (const group of availableGroups) {
      const found = group.sections.find((section) => section.id === activeId);
      if (found) return found;
    }
    return availableGroups[0]?.sections[0];
  }, [activeId, availableGroups]);

  useEffect(() => {
    if (!availableGroups.length) return;
    const exists = availableGroups.some((group) => group.sections.some((section) => section.id === activeId));
    if (!exists) {
      setActiveId(initialSectionId);
    }
  }, [activeId, availableGroups, initialSectionId]);

  useEffect(() => {
    let isMounted = true;
    if (!activeSection) {
      setContent("");
      return;
    }
    setIsLoading(true);
    loadWikiContent(activeSection.id)
      .then((text) => {
        if (isMounted) {
          setContent(text);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [activeSection]);

  return (
    <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
      <WikiSidebar groups={availableGroups} activeId={activeId} onSelect={setActiveId} />
      <WikiContent
        title={activeSection?.title ?? "Wiki"}
        markdown={isLoading ? "Cargando contenido..." : content}
        isProSection={activeSection?.isPro ?? false}
        isProEnabled={isProEnabled}
        onUnlockPro={onUnlockPro}
      />
    </div>
  );
}
