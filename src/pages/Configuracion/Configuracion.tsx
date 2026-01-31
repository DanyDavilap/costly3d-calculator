import Card from "../../components/ui/Card";

export default function Configuracion() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-slate-900">Configuración</h1>
      <Card subtitle="Gestiona marca y usuarios white-label">
        <p className="text-sm text-slate-600">
          Ajusta el archivo en <code>src/assets/brand</code> o conecta tu API para
          definir logotipos, colores y dominios personalizados. Este módulo sirve de
          recordatorio para completar el flujo cuando el cliente lo requiera.
        </p>
      </Card>
    </div>
  );
}
