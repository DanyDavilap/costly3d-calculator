import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { sendBetaWaitlistEmail } from "../../services/waitlist";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { status: authStatus } = useAuth();
  const BETA_WAITLIST_KEY = "costly3d_beta_waitlist_email_v1";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const readWaitlistCache = () => {
    try {
      const saved = sessionStorage.getItem(BETA_WAITLIST_KEY);
      if (!saved) return null;
      return JSON.parse(saved) as { email?: string; status?: "registered" | "already_registered" } | null;
    } catch (storageError) {
      return null;
    }
  };

  useEffect(() => {
    const cached = readWaitlistCache();
    const savedEmail = typeof cached?.email === "string" ? cached.email : "";
    if (!savedEmail) return;
    setEmail(savedEmail);
    if (cached?.status === "already_registered") {
      setSuccessMessage("Este correo ya estaba en la lista.");
      setStatus("success");
      setShowModal(true);
      return;
    }
    setSuccessMessage("Listo, quedaste en la lista.");
    setStatus("success");
    setShowModal(true);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status !== "idle") return;
    const trimmed = email.trim();
    const cached = readWaitlistCache();
    if (cached?.email === trimmed) {
      setSuccessMessage("Este correo ya estaba en la lista.");
      setStatus("success");
      setError("");
      setShowModal(true);
      return;
    }
    if (!isValidEmail(trimmed)) {
      setError("Ingresá un email válido.");
      return;
    }
    setError("");
    setSuccessMessage("");
    setStatus("submitting");
    void sendBetaWaitlistEmail(trimmed);
    try {
      sessionStorage.setItem(
        BETA_WAITLIST_KEY,
        JSON.stringify({
          email: trimmed,
          status: "registered",
          createdAt: new Date().toISOString(),
          source: "login_waitlist",
        }),
      );
    } catch {
      // ignore storage errors
    }
    setSuccessMessage("Correo verificado. Ya puedes entrar a la app.");
    setStatus("success");
    setShowModal(true);
  };

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center">
      <Card className="max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-2">Ingresar</h1>
        <p className="text-sm text-center text-slate-500 mb-6">Ingresa tu correo y entra directo.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-600">Correo</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2"
              placeholder="tu@correo.com"
              disabled={status === "submitting" || status === "success"}
            />
          </div>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={status === "submitting" || status === "success"}>
              {status === "submitting" ? "Validando..." : "Validar correo"}
            </Button>
            <Button
              type="button"
              className="w-full bg-slate-900 text-white hover:bg-slate-800"
              disabled={status !== "success" && authStatus !== "authenticated"}
              onClick={() => navigate("/app")}
            >
              Entrar a la app
            </Button>
          </div>
        </form>
      </Card>
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-slate-900">¡Gracias por anotarte a la beta!</h2>
            <p className="mt-3 text-sm text-slate-600">
              En el siguiente botón puedes entrar a la app con todas las herramientas habilitadas.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <Button
                className="w-full"
                onClick={() => {
                  setShowModal(false);
                  navigate("/app");
                }}
              >
                Entrar a la app
              </Button>
              <button
                type="button"
                className="text-sm text-slate-500 underline"
                onClick={() => setShowModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
