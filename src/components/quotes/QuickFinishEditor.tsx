import { Trash2 } from "lucide-react";

export type QuickFinishType = "sanding" | "painting" | "finishing";

type QuickFinishDraft = {
  id: string;
  name: string;
  minutes: string;
};

type QuickFinishEditorProps = {
  tasks: QuickFinishDraft[];
  onAdd: (type: QuickFinishType) => void;
  onChange: (id: string, updates: Partial<Pick<QuickFinishDraft, "name" | "minutes">>) => void;
  onRemove: (id: string) => void;
};

export default function QuickFinishEditor({ tasks, onAdd, onChange, onRemove }: QuickFinishEditorProps) {
  return (
    <div className="mt-6 rounded-2xl border border-gray-200 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-gray-900">Acabados opcionales</h4>
          <p className="mt-1 text-xs text-gray-500">
            {tasks.length === 0 ? "Solo impresión" : "Añade el tiempo de cada operación manual."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onAdd("sanding")} className="rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">+ Lijado</button>
          <button type="button" onClick={() => onAdd("painting")} className="rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">+ Pintado a mano</button>
          <button type="button" onClick={() => onAdd("finishing")} className="rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">+ Personalizado</button>
        </div>
      </div>
      {tasks.length > 0 && (
        <div className="mt-4 space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_140px_auto] sm:items-center">
              <input value={task.name} onChange={(event) => onChange(task.id, { name: event.target.value })} aria-label="Nombre del acabado" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <input type="number" min="0" value={task.minutes} placeholder="Minutos" aria-label={`Minutos de ${task.name}`} onChange={(event) => onChange(task.id, { minutes: event.target.value })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <button type="button" onClick={() => onRemove(task.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label="Eliminar acabado"><Trash2 size={17} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
