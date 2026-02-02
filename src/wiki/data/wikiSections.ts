export type WikiSectionMeta = {
  id: string;
  title: string;
  file: string;
  isPro?: boolean;
};

export type WikiGroup = {
  id: string;
  title: string;
  sections: WikiSectionMeta[];
};

export const wikiGroups: WikiGroup[] = [
  {
    id: "basicos",
    title: "Fundamentos",
    sections: [
      { id: "intro", title: "Introducción", file: "intro.md" },
      { id: "concepts", title: "Conceptos clave", file: "concepts.md" },
      { id: "glossary", title: "Glosario", file: "glossary.md" },
    ],
  },
  {
    id: "operacion",
    title: "Operación",
    sections: [
      { id: "materials", title: "Materiales y Stock", file: "materials.md" },
      { id: "quotes", title: "Cotizaciones", file: "quotes.md" },
      { id: "production", title: "Producción", file: "production.md" },
      { id: "failures", title: "Fallos", file: "failures.md" },
      { id: "reports", title: "Reportes", file: "reports.md" },
      { id: "scenarios", title: "Comparador de escenarios", file: "scenarios.md" },
    ],
  },
  {
    id: "pro",
    title: "PRO",
    sections: [
      { id: "pricing", title: "Estrategia de precios", file: "pricing.md", isPro: true },
      { id: "failure-reduction", title: "Reducción de fallos", file: "failure-reduction.md", isPro: true },
      { id: "organization", title: "Organización operativa", file: "organization.md", isPro: true },
      { id: "mindset", title: "Mentalidad de negocio 3D", file: "mindset.md", isPro: true },
    ],
  },
];

export const defaultWikiSectionId = wikiGroups[0]?.sections[0]?.id ?? "intro";
