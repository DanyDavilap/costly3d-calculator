import type { MaterialPriceMap } from "../../persistence/costProfilePersistence";

type MaterialPricesEditorProps = {
  prices: MaterialPriceMap;
  onChange: (material: keyof MaterialPriceMap, value: number) => void;
};

const MATERIALS: Array<keyof MaterialPriceMap> = ["PLA", "PETG", "TPU", "ABS"];

export default function MaterialPricesEditor({ prices, onChange }: MaterialPricesEditorProps) {
  return (
    <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
      <div>
        <h2 className="text-lg font-bold text-gray-900">¿Cuánto pagas por tus materiales?</h2>
        <p className="mt-1 text-sm text-gray-500">Escribe el precio de un kilo. Lo guardamos automáticamente.</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {MATERIALS.map((material) => (
          <label key={material} className="text-sm font-semibold text-gray-700">
            {material} / kg
            <div className="mt-2 flex items-center rounded-xl border-2 border-gray-200 bg-white px-3 focus-within:border-blue-500">
              <span className="text-sm text-gray-400">$</span>
              <input
                type="number"
                min="0"
                step="100"
                value={prices[material]}
                onChange={(event) => onChange(material, Math.max(0, Number(event.target.value) || 0))}
                className="min-w-0 w-full bg-transparent px-2 py-3 text-right font-semibold text-gray-900 outline-none"
              />
            </div>
          </label>
        ))}
      </div>
    </section>
  );
}
