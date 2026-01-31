import Card from "../../components/ui/Card";

export default function Faltantes() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-slate-900">Faltantes</h1>
      <Card subtitle="Registra materias primas o pedidos críticos.">
        <ul className="list-disc pl-6 text-sm text-slate-600 space-y-2">
          <li>Este módulo puede consumir tu fuente actual de inventario.</li>
          <li>Centraliza alertas para resurtir materiales y filamento.</li>
        </ul>
      </Card>
    </div>
  );
}
