import { FormEvent, useState } from "react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const { loginWithEmail } = useAuth();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setMessage("");
    loginWithEmail(email.trim())
      .then((result) => {
        if (result.status === "link_sent") {
          setStatus("sent");
          setMessage("Listo. Revisa tu correo para ingresar a Costly3D.");
          return;
        }
        if (result.status === "beta_full") {
          setStatus("idle");
          return;
        }
        setStatus("error");
        setMessage(result.message);
      })
      .catch(() => {
        setStatus("error");
        setMessage("No pudimos enviar el acceso. Intenta de nuevo.");
      });
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
            />
          </div>
          {message && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                status === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {message}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={status === "sending"}>
            {status === "sending" ? "Enviando..." : "Enviar link"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
