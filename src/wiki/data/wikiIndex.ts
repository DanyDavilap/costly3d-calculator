const wikiFiles = import.meta.glob("../content/*.md", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const wikiProFiles = import.meta.glob("../pro/*.md", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const wikiContentUrls: Record<string, string> = {
  intro: wikiFiles["../content/intro.md"],
  concepts: wikiFiles["../content/concepts.md"],
  glossary: wikiFiles["../content/glossary.md"],
  materials: wikiFiles["../content/materials.md"],
  quotes: wikiFiles["../content/quotes.md"],
  production: wikiFiles["../content/production.md"],
  failures: wikiFiles["../content/failures.md"],
  reports: wikiFiles["../content/reports.md"],
  scenarios: wikiFiles["../content/scenarios.md"],
  pricing: wikiProFiles["../pro/pricing.md"],
  "failure-reduction": wikiProFiles["../pro/failure-reduction.md"],
  organization: wikiProFiles["../pro/organization.md"],
  mindset: wikiProFiles["../pro/mindset.md"],
};

export const loadWikiContent = async (id: string) => {
  const url = wikiContentUrls[id];
  if (!url) return "";
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(buffer);
};
