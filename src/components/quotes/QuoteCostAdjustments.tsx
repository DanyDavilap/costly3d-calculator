import type { QuoteCostOverrides, QuoteCostSettings } from "../../domain/costProfile";

type CostField = keyof QuoteCostSettings;

type QuoteCostAdjustmentsProps = {
  defaults: QuoteCostSettings;
  overrides: QuoteCostOverrides;
  onChange: (field: CostField, value: number) => void;
  onResetField: (field: CostField) => void;
  onRestoreCostly: () => void;
  onSaveAsDefaults: () => void;
};

const FIELDS: Array<{
  field: CostField;
  label: string;
  suffix: string;
  step: number;
}> = [
  { field: "materialCostPerKg", label: "Costo del material", suffix: "COP/kg", step: 100 },
  { field: "electricityCostPerKwh", label: "Electricidad", suffix: "COP/kWh", step: 1 },
  { field: "laborCostPerHour", label: "Mano de obra", suffix: "COP/h", step: 100 },
  { field: "failureReservePercent", label: "Reserva por errores", suffix: "%", step: 1 },
  { field: "wearPercent", label: "Desgaste de máquina", suffix: "%", step: 1 },
  { field: "markupPercent", label: "Ganancia sobre costo", suffix: "% markup", step: 1 },
];

export default function QuoteCostAdjustments({
  defaults,
  overrides,
  onChange,
  onResetField,
  onRestoreCostly,
  onSaveAsDefaults,
}: QuoteCostAdjustmentsProps) {
  const customizedCount = Object.values(overrides).filter((value) => value !== undefined).length;

  return (
    <details className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-gray-900">2. Ajustar costos de esta cotización</p>
            <p className="mt-1 text-xs text-gray-500">Opcional. Si no cambias nada, usamos tus valores base.</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${customizedCount > 0 ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>
            {customizedCount > 0 ? `${customizedCount} personalizado${customizedCount === 1 ? "" : "s"}` : "Valores base"}
          </span>
        </div>
      </summary>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {FIELDS.map(({ field, label, suffix, step }) => {
          const customized = overrides[field] !== undefined;
          return (
            <label key={field} className="rounded-xl border border-gray-200 bg-white p-4">
              <span className="flex items-center justify-between gap-2 text-sm font-semibold text-gray-700">
                {label}
                <span className={`text-[10px] uppercase tracking-wide ${customized ? "text-blue-600" : "text-emerald-600"}`}>
                  {customized ? "Personalizado" : "Base"}
                </span>
              </span>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step={step}
                  value={overrides[field] ?? defaults[field]}
                  onChange={(event) => onChange(field, Math.max(0, Number(event.target.value) || 0))}
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-right font-semibold outline-none focus:border-blue-500"
                />
                <span className="w-20 text-xs text-gray-500">{suffix}</span>
              </div>
              {customized && (
                <button type="button" onClick={() => onResetField(field)} className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700">
                  Usar valor base
                </button>
              )}
              {field === "markupPercent" && (
                <p className="mt-2 text-xs text-gray-500">100% de markup duplica el costo y equivale a 50% de margen bruto.</p>
              )}
            </label>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={onRestoreCostly} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          Restaurar valores Costly
        </button>
        <button type="button" onClick={onSaveAsDefaults} disabled={customizedCount === 0} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">
          Guardar como mis valores base
        </button>
      </div>
    </details>
  );
}
