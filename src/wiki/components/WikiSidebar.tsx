import ProBadge from "./ProBadge";
import type { WikiGroup } from "../data/wikiSections";

type WikiSidebarProps = {
  groups: WikiGroup[];
  activeId: string;
  onSelect: (id: string) => void;
};

export default function WikiSidebar({ groups, activeId, onSelect }: WikiSidebarProps) {
  return (
    <aside className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-3">Wiki Costly3D</p>
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.id}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{group.title}</p>
            <div className="flex flex-col gap-2">
              {group.sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onSelect(section.id)}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                    activeId === section.id ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span>{section.title}</span>
                  {section.isPro && <ProBadge />}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
