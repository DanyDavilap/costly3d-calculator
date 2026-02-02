import intro from "../content/intro.md?raw";
import concepts from "../content/concepts.md?raw";
import glossary from "../content/glossary.md?raw";
import materials from "../content/materials.md?raw";
import quotes from "../content/quotes.md?raw";
import production from "../content/production.md?raw";
import failures from "../content/failures.md?raw";
import reports from "../content/reports.md?raw";
import scenarios from "../content/scenarios.md?raw";
import pricing from "../pro/pricing.md?raw";
import failureReduction from "../pro/failure-reduction.md?raw";
import organization from "../pro/organization.md?raw";
import mindset from "../pro/mindset.md?raw";

const wikiContentIndex: Record<string, string> = {
  intro,
  concepts,
  glossary,
  materials,
  quotes,
  production,
  failures,
  reports,
  scenarios,
  pricing,
  "failure-reduction": failureReduction,
  organization,
  mindset,
};

export const getWikiContent = (id: string) => wikiContentIndex[id] ?? "";
