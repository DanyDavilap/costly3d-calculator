import { useEffect, useRef, useState, type FormEvent } from "react";
import { Analytics } from "@vercel/analytics/react";
import { track } from "@vercel/analytics";
import { Toaster } from "sonner";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import DebugAnalyticsPanel, { debugTrack } from "./components/DebugAnalyticsPanel";
import Dashboard from "./pages/Dashboard/Dashboard";
import Landing from "./pages/Landing/Landing";
import Login from "./pages/Login/Login";
import Items from "./pages/Items/Items";
import Faltantes from "./pages/Faltantes/Faltantes";
import Reportes from "./pages/Reportes/Reportes";
import Configuracion from "./pages/Configuracion/Configuracion";
import Wiki from "./pages/Wiki/Wiki";
import { isDev } from "./utils/proPermissions";
import { ensureBetaStartedAt, getAppMode, isBeta, openBetaAccessForm } from "./utils/appMode";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { isAuthConfigured } from "./services/auth";
import { sendBetaWaitlistEmail } from "./services/waitlist";
import Card from "./components/ui/Card";
import Button from "./components/ui/Button";

export default function App() {
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [proModalSource, setProModalSource] = useState<"limit" | "cta" | null>(null);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const waitlistTimerRef = useRef<number | null>(null);
  const FREE_LIMIT_EVENT_KEY = "costly3d_free_limit_reached_v1";
  const showProFlows = false; // TODO: reactivar flujo PRO cuando corresponda.
  const devMode = isDev();
  const DEV_APP_MODE_KEY = "costly3d_dev_app_mode";
  const DEV_BETA_GATE_KEY = "costly3d_dev_beta_gate";
  const [devAppMode, setDevAppMode] = useState<"env" | "pro" | "beta">(() => {
    if (typeof window === "undefined") return "env";
    try {
      const stored = window.localStorage.getItem(DEV_APP_MODE_KEY);
      return stored === "beta" ? "beta" : stored === "pro" ? "pro" : "env";
    } catch (error) {
      return "env";
    }
  });
  const [devGateMode, setDevGateMode] = useState<"env" | "none" | "full">(() => {
    if (typeof window === "undefined") return "env";
    try {
      const stored = window.localStorage.getItem(DEV_BETA_GATE_KEY);
      return stored === "full" ? "full" : stored === "none" ? "none" : "env";
    } catch (error) {
      return "env";
    }
  });
  const navigate = useNavigate();
  const authConfigured = isAuthConfigured || import.meta.env.DEV === true;

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

  useEffect(() => {
    if (!isBeta()) return;
    ensureBetaStartedAt();
  }, []);

  const openProModal = (source: "limit" | "cta" = "cta") => {
    if (!showProFlows) return;
    // Contexto del modal PRO: diferencia entre acceso voluntario (CTA) y bloqueo por lÃ­mite FREE.
    // Punto Ãºnico de entrada PRO: se reutiliza tanto por lÃ­mite FREE como por CTA manual.
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
    if (!showProFlows) return;
    console.log("PRO_WAITLIST_OPEN");
    setIsWaitlistOpen(true);
  };

  const openProBetaForm = () => {
    if (import.meta.env.DEV) {
      debugTrack("pro_cta_click", { source: "free_limit_modal" });
    }
    track("pro_cta_click", { source: "free_limit_modal" });
    openBetaAccessForm();
  };

  const applyDevOverrides = (nextMode: "env" | "pro" | "beta", nextGate: "env" | "none" | "full") => {
    if (typeof window === "undefined") return;
    try {
      if (nextMode === "env") {
        localStorage.removeItem(DEV_APP_MODE_KEY);
      } else {
        localStorage.setItem(DEV_APP_MODE_KEY, nextMode);
      }
      if (nextGate === "env") {
        localStorage.removeItem(DEV_BETA_GATE_KEY);
      } else {
        localStorage.setItem(DEV_BETA_GATE_KEY, nextGate);
      }
    } catch (error) {
      // Ignore storage errors to avoid blocking the flow.
    }
    window.location.reload();
  };

  const resetBetaTokens = () => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem("beta_quotes_count");
      localStorage.removeItem("beta_productions_count");
      localStorage.removeItem("beta_started_at");
    } catch (error) {
      // Ignore storage errors to avoid blocking the flow.
    }
    window.location.reload();
  };

  const modalLayer = (
    <>
      <Toaster position="top-right" richColors />
      {showProFlows && isProModalOpen && (
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
                Ã—
              </button>
            </div>

            <ul className="mt-5 space-y-2 text-sm text-gray-700">
              <li>âœ“ Historial ilimitado de productos</li>
              <li>âœ“ Cotizaciones claras y reutilizables</li>
              <li>âœ“ AnÃ¡lisis real de rentabilidad</li>
              <li>âœ“ OrganizaciÃ³n profesional del catÃ¡logo</li>
              <li>âœ“ Mejor percepciÃ³n de marca y confianza</li>
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
      {showProFlows && isWaitlistOpen && (
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
                Ã—
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
      ðŸ›  DEV MODE ACTIVADO
    </div>
  ) : null;


  const LoadingScreen = () => (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Card className="max-w-md w-full text-center">
        <h1 className="text-xl font-bold text-slate-900">Verificando acceso...</h1>
        <p className="mt-2 text-sm text-slate-500">Un momento, estamos validando tu cuenta.</p>
      </Card>
    </div>
  );

  type BetaStatus = "open" | "full";
  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const BetaClosedScreen = ({ initialStatus = "open" }: { initialStatus?: BetaStatus }) => {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [betaStatus, setBetaStatus] = useState<BetaStatus>(initialStatus);

    useEffect(() => {
      setBetaStatus(initialStatus);
    }, [initialStatus]);

    useEffect(() => {
      // TODO: reemplazar por GET /beta-status cuando exista backend.
      // Respuesta esperada: { status: "open" | "full" }.
    }, []);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = email.trim();
      if (!isValidEmail(trimmed)) {
        setError("IngresÃ¡ un email vÃ¡lido.");
        return;
      }
      setStatus("submitting");
      const result = await sendBetaWaitlistEmail(trimmed);

      if (result.status === "registered") {
        sessionStorage.setItem("beta_waitlist_email", trimmed);
        setSuccessMessage(result.message);
        setStatus("success");
        setError("");
        return;
      }

      if (result.status === "already_registered") {
        setSuccessMessage(result.message);
        setStatus("success");
        setError("");
        return;
      }

      setStatus("idle");
      setError(result.message);
      setSuccessMessage("");
    };

    const isLocked = status === "submitting" || status === "success";
    const primaryLabel =
      status === "submitting"
        ? "Enviandoâ€¦"
        : status === "success"
          ? betaStatus === "open"
            ? "Solicitud enviada"
            : "Aviso enviado"
          : betaStatus === "open"
            ? "Solicitar acceso a la beta"
            : "Avisarme cuando haya acceso";

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Card className="max-w-md w-full text-center">
          {betaStatus === "full" ? (
            <>
              <h1 className="text-xl font-bold text-slate-900">ðŸš§ Beta cerrada (cupos completos)</h1>
              <p className="mt-2 text-sm text-slate-500">
                La beta de Costly3D tiene cupos limitados. Dejanos tu email y te avisamos cuando se libere un lugar.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-slate-900">Acceso a la beta cerrada de Costly3D</h1>
              <p className="mt-2 text-sm text-slate-500">
                Dejanos tu email para solicitar acceso. Te confirmaremos si quedas dentro del cupo disponible.
              </p>
            </>
          )}
          <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-left">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2"
                placeholder="tuemail@ejemplo.com"
                autoComplete="email"
                disabled={isLocked}
              />
            </div>
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {status === "success" && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage || "Listo, quedaste en la lista."}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLocked}>
              {primaryLabel}
            </Button>
          </form>
        </Card>
      </div>
    );
  };

  const ExpiredScreen = ({ onLogout }: { onLogout: () => void }) => (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Card className="max-w-md w-full text-center">
        <h1 className="text-xl font-bold text-slate-900">Acceso beta finalizado</h1>
        <p className="mt-2 text-sm text-slate-500">
          Tu acceso beta ha finalizado. Gracias por probar Costly3D.
        </p>
        <Button onClick={onLogout} className="mt-5 w-full">
          Salir
        </Button>
      </Card>
    </div>
  );

  const ErrorScreen = ({ onRetry }: { onRetry: () => void }) => (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Card className="max-w-md w-full text-center">
        <h1 className="text-xl font-bold text-slate-900">No pudimos validar tu acceso</h1>
        <p className="mt-2 text-sm text-slate-500">IntentÃ¡ ingresar nuevamente en unos minutos.</p>
        <Button onClick={onRetry} className="mt-5 w-full">
          Volver a intentar
        </Button>
      </Card>
    </div>
  );

  const BetaInfoScreen = () => <BetaClosedScreen initialStatus="open" />;

  const RequireAuth = ({ children }: { children: JSX.Element }) => {
    const location = useLocation();
    const { status, logout } = useAuth();
    if (status === "loading") return <LoadingScreen />;
    if (status === "misconfigured") return <BetaInfoScreen />;
    if (status === "beta_expired") return <ExpiredScreen onLogout={logout} />;
    if (status === "error") return <ErrorScreen onRetry={logout} />;
    if (status === "unauthenticated") {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return children;
  };

  const LoginRoute = () => {
    const location = useLocation();
    const { status, gateStatus } = useAuth();
    if (status === "misconfigured") {
      return <BetaInfoScreen />;
    }
    if (status === "authenticated") {
      const fromPath =
        (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/app";
      return <Navigate to={fromPath} replace />;
    }
    if (gateStatus === "beta_full") {
      return (
        <BetaClosedScreen
          initialStatus="full"
        />
      );
    }
    return <Login />;
  };

  const DashboardRoute = () => {
    const { profile } = useAuth();
    return (
      <RequireAuth>
        <Dashboard onOpenProModal={openProModal} access={profile ?? undefined} />
      </RequireAuth>
    );
  };

  const AuthLayout = () => {
    if (!authConfigured) {
      return <BetaInfoScreen />;
    }
    return (
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    );
  };

  return (
    <>
      {modalLayer}
      {devBadge}
      <Routes>
        <Route
          path="/"
          element={
            <Landing
              onStart={() => {
                if (!authConfigured) {
                  navigate("/beta-info");
                  return;
                }
                navigate("/app");
              }}
              onOpenProModal={() => openProModal("cta")}
            />
          }
        />
        <Route path="/beta-info" element={<BetaInfoScreen />} />
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/app/*" element={<DashboardRoute />} />
          <Route
            path="/items"
            element={
              <RequireAuth>
                <Items />
              </RequireAuth>
            }
          />
          <Route
            path="/faltantes"
            element={
              <RequireAuth>
                <Faltantes />
              </RequireAuth>
            }
          />
          <Route
            path="/reportes"
            element={
              <RequireAuth>
                <Reportes />
              </RequireAuth>
            }
          />
          <Route
            path="/configuracion"
            element={
              <RequireAuth>
                <Configuracion />
              </RequireAuth>
            }
          />
          <Route
            path="/wiki"
            element={
              <RequireAuth>
                <Wiki />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Navigate to="/app" replace />
              </RequireAuth>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Analytics />
      {import.meta.env.DEV && <DebugAnalyticsPanel />}
    </>
  );
}

