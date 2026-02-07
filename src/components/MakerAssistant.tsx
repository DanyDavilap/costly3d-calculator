import { useEffect, useMemo, useState } from "react";
import Button from "./ui/Button";
import Card from "./ui/Card";

type AssistantResult = {
  diagnostico: string[];
  checklist: string[];
  ajustes: { item: string; valor_sugerido: string; por_que: string }[];
  plan_prueba: { paso: string; cambio: string; esperado: string }[];
  prevencion: string[];
  mensaje_cliente: string;
};

type HistoryItem = {
  text: string;
  timestamp: number;
  result: AssistantResult;
};

const HISTORY_KEY = "maker_assistant_history_v1";
const MAX_HISTORY = 10;

export default function MakerAssistant() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as HistoryItem[];
      if (Array.isArray(parsed)) {
        setHistory(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
    } catch {
      // ignore
    }
  }, [history]);

  const saveHistory = (entry: HistoryItem) => {
    setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
  };

  const examplePlaceholder =
    "Ej: Hoy me devolvieron una pieza de dinosaurio por mala movibilidad; articulaciones duras y stringing en los hombros.";

  const handleSubmit = async () => {
    if (!text.trim()) {
      setError("Escribe un caso para diagnosticar.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/maker-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await response.json()) as { ok: boolean; result?: AssistantResult; error?: string };
      if (!data.ok || !data.result) {
        setError(data.error || "No pudimos procesar el diagnóstico.");
        return;
      }
      setResult(data.result);
      saveHistory({ text: text.trim(), timestamp: Date.now(), result: data.result });
    } catch (err) {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const lastConsults = useMemo(() => history.slice(0, MAX_HISTORY), [history]);

  const copyMensaje = () => {
    if (!result) return;
    navigator.clipboard?.writeText(result.mensaje_cliente).catch(() => {});
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Asistente Maker 3D (Gemini)</h3>
            <p className="text-sm text-slate-600">
              Diagnósticos rápidos y planes de prueba para piezas articuladas (PLA/PETG).
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
            placeholder={examplePlaceholder}
            maxLength={1200}
            disabled={loading}
          />
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{text.length}/1200</span>
            {error && <span className="text-red-600 font-semibold">{error}</span>}
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSubmit} disabled={loading} className="min-w-[140px]">
              {loading ? "Diagnosticando..." : "Diagnosticar"}
            </Button>
            <button
              type="button"
              className="text-sm text-slate-500 underline"
              onClick={() => setText(examplePlaceholder)}
              disabled={loading}
            >
              Usar ejemplo
            </button>
          </div>
        </div>
      </Card>

      {result && (
        <div className="space-y-4">
          <Card>
            <h4 className="text-base font-semibold text-slate-900 mb-2">Diagnóstico probable</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
              {result.diagnostico.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>

          <Card>
            <h4 className="text-base font-semibold text-slate-900 mb-2">Checklist rápido</h4>
            <ul className="space-y-2">
              {result.checklist.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <input type="checkbox" className="mt-1 h-4 w-4" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h4 className="text-base font-semibold text-slate-900 mb-2">Ajustes recomendados</h4>
            <div className="space-y-3 text-sm text-slate-700">
              {result.ajustes.map((ajuste) => (
                <div
                  key={`${ajuste.item}-${ajuste.valor_sugerido}`}
                  className="rounded-xl border border-slate-200 px-3 py-2"
                >
                  <p className="font-semibold text-slate-900">{ajuste.item}</p>
                  <p className="text-slate-700">Valor sugerido: {ajuste.valor_sugerido}</p>
                  <p className="text-slate-500 text-xs mt-1">{ajuste.por_que}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h4 className="text-base font-semibold text-slate-900 mb-2">Plan de prueba</h4>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700">
              {result.plan_prueba.map((paso, idx) => (
                <li key={`${paso.paso}-${idx}`}>
                  <div className="font-semibold text-slate-900">{paso.paso}</div>
                  <div className="text-slate-700">Cambio: {paso.cambio}</div>
                  <div className="text-slate-500 text-xs">Esperado: {paso.esperado}</div>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <h4 className="text-base font-semibold text-slate-900 mb-2">Prevención</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
              {result.prevencion.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold text-slate-900">Mensaje corto para el cliente</h4>
              <button
                type="button"
                onClick={copyMensaje}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                Copiar
              </button>
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-line">{result.mensaje_cliente}</p>
          </Card>
        </div>
      )}

      {lastConsults.length > 0 && (
        <Card>
          <h4 className="text-base font-semibold text-slate-900 mb-2">Últimas consultas</h4>
          <ul className="space-y-2 text-sm text-slate-700">
            {lastConsults.map((item) => (
              <li key={item.timestamp} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>{new Date(item.timestamp).toLocaleString()}</span>
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => {
                      setText(item.text);
                      setResult(item.result);
                    }}
                  >
                    Cargar
                  </button>
                </div>
                <p className="text-slate-700">{item.text}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
