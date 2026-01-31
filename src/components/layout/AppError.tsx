import { isRouteErrorResponse, useRouteError } from "react-router-dom";

export default function AppError() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <ErrorShell
        title="Oops, algo salió mal"
        message={`${error.status} - ${error.statusText}`}
      />
    );
  }

  return (
    <ErrorShell
      title="Se produjo un error inesperado"
      message={
        error instanceof Error ? error.message : "Intenta recargar la página."
      }
    />
  );
}

function ErrorShell({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-app-gradient text-center px-6">
      <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
      <p className="text-slate-600 max-w-md">{message}</p>
      <button
        className="rounded-full bg-[var(--color-accent)] px-5 py-2 text-white font-semibold"
        onClick={() => window.location.replace("/")}
      >
        Volver al inicio
      </button>
    </div>
  );
}
