import { FormEvent, useEffect, useState } from "react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { sendBetaWaitlistEmail } from "../../services/waitlist";

export default function Login() {
  const BETA_WAITLIST_KEY = "costly3d_beta_waitlist_email_v1";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
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
    // Restauramos el email guardado para evitar envÃ­os mÃºltiples en la sesiÃ³n.
    const cached = readWaitlistCache();
    const savedEmail = typeof cached?.email === "string" ? cached.email : "";
    if (!savedEmail) return;
    setEmail(savedEmail);
    if (cached?.status === "already_registered") {
      setSuccessMessage("Este correo ya estaba en la lista.");
      setStatus("success");
      return;
    }
    setSuccessMessage("Listo, quedaste en la lista.");
    setStatus("success");
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
      return;
    }
    if (!isValidEmail(trimmed)) {
      setError("IngresÃ¡ un email vÃ¡lido.");
      return;
    }
    setError("");
    setSuccessMessage("");
    setStatus("submitting");
    const result = await sendBetaWaitlistEmail(trimmed);
    if (result.status === "registered") {
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
      } catch (storageError) {
        // Ignore storage errors to avoid blocking the UI.
      }
      setSuccessMessage(result.message);
      setStatus("success");
      return;
    }
    if (result.status === "already_registered") {
      try {
        sessionStorage.setItem(
          BETA_WAITLIST_KEY,
          JSON.stringify({
            email: trimmed,
            status: "already_registered",
            createdAt: new Date().toISOString(),
            source: "login_waitlist",
          }),
        );
      } catch (storageError) {
        // Ignore storage errors to avoid blocking the UI.
      }
      setSuccessMessage(result.message);
      setStatus("success");
      setError("");
      return;
    }
    setStatus("idle");
    setError(result.message);
  };

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center">
      <Card className="max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-2">Ingresar</h1>
        <p className="text-sm text-center text-slate-500 mb-6">
          Ingresa tu correo para recibir el link de acceso.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-600">Correo</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2"
              placeholder="admin@totys.land"
              disabled={status === "submitting" || status === "success"}
            />
          </div>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {status === "success" && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage || "Correo registrado. Te contactaremos si quedÃ¡s dentro de la beta."}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={status === "submitting" || status === "success"}>
            {status === "submitting" ? "Enviandoâ€¦" : "Enviar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

