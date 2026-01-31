import Card from "../../components/ui/Card";

export default function Reportes() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-slate-900">Reportes</h1>
      <Card subtitle="Exporta resultados de la calculadora 3D">
        <p className="text-sm text-slate-600">
          Conecta tus rutinas actuales de exportación o BI. La calculadora continuará
          guardando datos en localStorage hasta que se integre una API segura.
        </p>
      </Card>
    </div>
  );
}
