import { useEffect, useRef, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { track } from "@vercel/analytics";
import { Toaster } from "sonner";
import DebugAnalyticsPanel, { debugTrack } from "./components/DebugAnalyticsPanel";
import Dashboard from "./pages/Dashboard/Dashboard";
import Landing from "./pages/Landing/Landing";
import { isDev } from "./utils/proPermissions";

export default function App() {
  const [view, setView] = useState<"landing" | "app">("landing");
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [proModalSource, setProModalSource] = useState<"limit" | "cta" | null>(null);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const waitlistTimerRef = useRef<number | null>(null);
  const FREE_LIMIT_EVENT_KEY = "costly3d_free_limit_reached_v1";
  const devMode = isDev();
  const devForcePro = devMode;

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    try {
      if (localStorage.getItem("costly3d_dev_mode") !== "true") {
        localStorage.setItem("costly3d_dev_mode", "true");
        window.location.reload();
      }
    } catch (error) {
      // Ignore storage errors to avoid blocking the app.
    }
  }, []);

  const openProModal = (source: "limit" | "cta" = "cta") => {
    // Contexto del modal PRO: diferencia entre acceso voluntario (CTA) y bloqueo por lÃ­mite FREE.
    // Punto Ãºnico de entrada PRO: se reutiliza tanto por lÃ­mite FREE como por CTA manual.
    if (devForcePro) return;
    setProModalSource(source);
    setIsProModalOpen(true);
  };

  useEffect(() => {
    if (!isProModalOpen || proModalSource !== "limit") return;
    let alreadyTracked = false;
    try {
      alreadyTracked = sessionStorage.getItem(FREE_LIMIT_EVENT_KEY) === "1";
    } catch (error) {
      alreadyTracked = false;
    }
    if (alreadyTracked) return;
    if (import.meta.env.DEV) {
      debugTrack("free_limit_reached", { source: "free_limit_modal" });
    }
    track("free_limit_reached", { source: "free_limit_modal" });
    try {
      sessionStorage.setItem(FREE_LIMIT_EVENT_KEY, "1");
    } catch (error) {
      // Ignore storage errors to avoid blocking the flow.
    }
  }, [isProModalOpen, proModalSource]);

  useEffect(() => {
    return () => {
      if (waitlistTimerRef.current) {
        window.clearTimeout(waitlistTimerRef.current);
        waitlistTimerRef.current = null;
      }
    };
  }, []);

  const closeWaitlistModal = () => {
    if (waitlistTimerRef.current) {
      window.clearTimeout(waitlistTimerRef.current);
      waitlistTimerRef.current = null;
    }
    setIsWaitlistOpen(false);
    setWaitlistSuccess(false);
    setWaitlistEmail("");
  };

  const openWaitlistModal = () => {
    console.log("PRO_WAITLIST_OPEN");
    setIsWaitlistOpen(true);
  };

  const openProBetaForm = () => {
    if (import.meta.env.DEV) {
      debugTrack("pro_cta_click", { source: "free_limit_modal" });
    }
    track("pro_cta_click", { source: "free_limit_modal" });
    window.open(
      "https://docs.google.com/forms/d/e/1FAIpQLSckMvV_judFYw4r5OY_2Rbf8miQAUVwbKXqosMuW41G1qVzKQ/viewform",
      "_blank",
      "noopener,noreferrer",
    );
  };

  const modalLayer = (
    <>
      <Toaster position="top-right" richColors />
      {isProModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setIsProModalOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="InformaciÃ³n sobre versiÃ³n PRO"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Acceso anticipado Costly3D PRO</h2>
                {proModalSource === "limit" && (
                  <p className="mt-3 text-sm text-gray-600">
                    Ya alcanzaste el lÃ­mite de 3 productos en la versiÃ³n gratuita de Costly3D.
                  </p>
                )}
                <p className="mt-3 text-sm text-gray-600">
                  DejÃ¡ de improvisar precios. EmpezÃ¡ a vender con claridad, consistencia y criterio profesional.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsProModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Cerrar"
              >
                âœ•
              </button>
            </div>

            <ul className="mt-5 space-y-2 text-sm text-gray-700">
              <li>âœ” Historial ilimitado de productos</li>
              <li>âœ” Cotizaciones claras y reutilizables</li>
              <li>âœ” AnÃ¡lisis real de rentabilidad</li>
              <li>âœ” OrganizaciÃ³n profesional del catÃ¡logo</li>
              <li>âœ” Mejor percepciÃ³n de marca y confianza</li>
            </ul>

            <p className="mt-5 text-sm font-medium text-gray-700">
              Si ya estÃ¡s vendiendo, Costly3D PRO te ahorra errores, tiempo y dinero.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="bg-gradient-to-r from-blue-500 to-green-500 text-white font-semibold px-5 py-3 rounded-xl hover:from-blue-600 hover:to-green-600 transition-all"
                onClick={() => {
                  console.log("CTA_PRO_CLICK");
                  setIsProModalOpen(false);
                  openWaitlistModal();
                }}
              >
                Quiero acceso anticipado PRO
              </button>
              <button
                type="button"
                className="bg-gray-100 text-gray-700 font-semibold px-5 py-3 rounded-xl hover:bg-gray-200 transition-all"
                onClick={() => setIsProModalOpen(false)}
              >
                Probar versiÃ³n gratuita
              </button>
            </div>
          </div>
        </div>
      )}
      {isWaitlistOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={closeWaitlistModal}
        >
          <div
            className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Acceso anticipado a Costly3D PRO"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Acceso anticipado a Costly3D PRO</h2>
                <p className="mt-3 text-sm text-gray-600">
                  Costly3D PRO estÃ¡ diseÃ±ado para makers y talleres que ya venden y quieren controlar sus costos con
                  claridad.
                </p>
                <p className="mt-3 text-sm text-gray-600">Estamos habilitando el acceso de forma gradual.</p>
              </div>
              <button
                type="button"
                onClick={closeWaitlistModal}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Cerrar"
              >
                âœ•
              </button>
            </div>

            {waitlistSuccess ? (
              <div className="mt-6 rounded-2xl bg-green-50 border border-green-100 p-4 text-green-700 text-sm font-medium">
                Â¡Listo! Te avisaremos cuando Costly3D PRO estÃ© disponible.
              </div>
            ) : (
              <>
                <div className="mt-5">
                  <input
                    type="email"
                    value={waitlistEmail}
                    onChange={(event) => setWaitlistEmail(event.target.value)}
                    placeholder="Tu email de trabajo"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="bg-gradient-to-r from-blue-500 to-green-500 text-white font-semibold px-5 py-3 rounded-xl hover:from-blue-600 hover:to-green-600 transition-all"
                    onClick={() => {
                      openProBetaForm();
                    }}
                  >
                    Quiero acceso PRO
                  </button>
                  <button
                    type="button"
                    className="bg-gray-100 text-gray-700 font-semibold px-5 py-3 rounded-xl hover:bg-gray-200 transition-all"
                    onClick={closeWaitlistModal}
                  >
                    Seguir probando (solo lectura)
                  </button>
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  Estamos en beta. El acceso se habilita a partir de este formulario.
                </p>
                <p className="mt-4 text-xs text-gray-500">
                  No enviamos spam. Te avisaremos cuando PRO estÃ© disponible.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );

  const devBadge = devMode ? (
    <div className="fixed top-4 right-4 z-50 rounded-full bg-slate-900/90 px-4 py-2 text-xs font-semibold text-white shadow-lg">
      🛠 DEV MODE ACTIVADO
    </div>
  ) : null;

  if (view === "landing") {
    return (
      <>
        <Landing onStart={() => setView("app")} onOpenProModal={() => openProModal("cta")} />
        <Analytics />
        {import.meta.env.DEV && <DebugAnalyticsPanel />}
        {devBadge}
        {modalLayer}
      </>
    );
  }

  return (
    <>
      <Dashboard onOpenProModal={openProModal} />
      <Analytics />
      {import.meta.env.DEV && <DebugAnalyticsPanel />}
      {devBadge}
      {modalLayer}
    </>
  );
}


