import Card from "../../components/ui/Card";

export default function Items() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-slate-900">Items</h1>
      <Card subtitle="Catálogo administrativo en construcción.">
        <p className="text-sm text-slate-500">
          Aquí podrás administrar piezas, costos y disponibilidad sin afectar la lógica
          actual. Integra tus APIs existentes cuando estén listas.
        </p>
      </Card>
    </div>
  );
}
