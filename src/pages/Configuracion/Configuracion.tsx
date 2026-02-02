import { useState } from "react";
import Card from "../../components/ui/Card";
import { isDarkModeEnabled, toggleDarkMode } from "../../utils/theme";

export default function Configuracion() {
  const [isDark, setIsDark] = useState(isDarkModeEnabled());

  const handleToggleDarkMode = () => {
    const next = toggleDarkMode();
    setIsDark(next === "dark");
  };

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-[color:var(--color-text)]">Configuracion</h1>
      <Card title="Modo oscuro" subtitle="Cambia el estilo general de la interfaz">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-[color:var(--color-text-muted)]">
            Activa el modo oscuro para sesiones nocturnas o ambientes con poca luz.
          </p>
          <button
            type="button"
            role="switch"
            aria-checked={isDark}
            onClick={handleToggleDarkMode}
            className={`relative inline-flex h-8 w-14 items-center rounded-full px-1 transition-colors ${
              isDark ? "bg-[color:var(--color-accent-strong)]" : "bg-[color:var(--color-border)]"
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-[color:var(--color-surface)] shadow-sm transition ${
                isDark ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </Card>
      <Card subtitle="Gestiona marca y usuarios white-label">
        <p className="text-sm text-[color:var(--color-text-muted)]">
          Ajusta el archivo en <code>src/assets/brand</code> o conecta tu API para definir logotipos,
          colores y dominios personalizados. Este modulo sirve de recordatorio para completar el flujo
          cuando el cliente lo requiera.
        </p>
      </Card>
    </div>
  );
}
