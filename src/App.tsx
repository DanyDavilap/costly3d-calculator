import { FormEvent, useEffect, useRef, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "sonner";
import Dashboard from "./pages/Dashboard/Dashboard";
import Landing from "./pages/Landing/Landing";
import Card from "./components/ui/Card";
import Button from "./components/ui/Button";
import { sendBetaWaitlistEmail } from "./services/waitlist";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CAFECITO_URL } from "./config/links";

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

function AppShell() {
  const { status: authStatus, loginWithEmail } = useAuth();
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [cafecitoModalOpen, setCafecitoModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const cafecitoTimerRef = useRef<number | null>(null);
  const CAFECITO_SEEN_KEY = "costly3d_cafecito_prompt_seen_v1";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "submitting") return;
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setError("Ingresá un email válido.");
      return;
    }
    setError("");
    setStatus("submitting");
    const result = await sendBetaWaitlistEmail(trimmed);
    if (result.status === "error") {
      setError(result.message);
      setStatus("idle");
      return;
    }
    setMessage(result.message || "Listo, quedaste en la lista.");
    await loginWithEmail(trimmed);
    setStatus("idle");
    setEmailModalOpen(false);
    setSuccessModalOpen(true);
  };

  const closeSuccessModal = () => setSuccessModalOpen(false);

  const openEmailModal = () => {
    setEmailModalOpen(true);
    setSuccessModalOpen(false);
    setError("");
    setMessage("");
  };

  const appVisible = authStatus === "authenticated";

  useEffect(() => {
    if (!appVisible) return;
    const alreadySeen = (() => {
      try {
        return sessionStorage.getItem(CAFECITO_SEEN_KEY) === "1";
      } catch {
        return false;
      }
    })();
    if (alreadySeen) return;
    cafecitoTimerRef.current = window.setTimeout(() => {
      setCafecitoModalOpen(true);
      try {
        sessionStorage.setItem(CAFECITO_SEEN_KEY, "1");
      } catch {
        // ignore
      }
    }, 60000);
    return () => {
      if (cafecitoTimerRef.current) {
        window.clearTimeout(cafecitoTimerRef.current);
        cafecitoTimerRef.current = null;
      }
    };
  }, [appVisible]);

  return (
    <>
      <Toaster position="top-right" richColors />

      {appVisible ? (
        <Dashboard />
      ) : (
        <Landing onStart={openEmailModal} onOpenProModal={openEmailModal} />
      )}

      {emailModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setEmailModalOpen(false)}
        >
          <div
            className="w-full max-w-md"
            onClick={(event) => event.stopPropagation()}
          >
            <Card className="w-full">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Deja tu correo</h2>
              <p className="text-sm text-slate-500 mb-4">Te avisamos y abrimos la app completa al instante.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600">Correo</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    placeholder="tu@correo.com"
                    disabled={status === "submitting"}
                  />
                </div>
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={status === "submitting"}>
                  {status === "submitting" ? "Enviando..." : "Registrar email"}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      )}

      {successModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          onClick={closeSuccessModal}
        >
          <div
            className="w-full max-w-md"
            onClick={(event) => event.stopPropagation()}
          >
            <Card className="w-full">
              <h2 className="text-2xl font-bold text-slate-900">Gracias por registrarte</h2>
              <p className="mt-2 text-sm text-slate-600">
                {message || "Ahora probá tu aplicación."}
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <Button
                  className="w-full"
                  onClick={closeSuccessModal}
                >
                  Abrir app
                </Button>
                <button
                  type="button"
                  className="text-sm text-slate-500 underline"
                  onClick={closeSuccessModal}
                >
                  Cerrar
                </button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {cafecitoModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setCafecitoModalOpen(false)}
        >
          <div
            className="w-full max-w-md"
            onClick={(event) => event.stopPropagation()}
          >
            <Card className="w-full text-center space-y-4">
              <h2 className="text-2xl font-bold text-slate-900">¿Te gusta la app?</h2>
              <p className="text-sm text-slate-600">
                Proyecto independiente. Si te sirve, podés apoyarlo con un Cafecito.
              </p>
              <div className="flex flex-col gap-3">
                <a
                  href={CAFECITO_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition"
                >
                  Invitar un Cafecito
                </a>
                <button
                  type="button"
                  className="text-sm text-slate-500 underline"
                  onClick={() => setCafecitoModalOpen(false)}
                >
                  Quizás después
                </button>
              </div>
            </Card>
          </div>
        </div>
      )}

      <Analytics />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
