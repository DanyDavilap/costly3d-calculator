import { FormEvent, useState } from "react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { login } from "../../services/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) return;
    login("demo-token");
    window.location.href = "/";
  };

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center">
      <Card className="max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-2">Ingresar</h1>
        <p className="text-sm text-center text-slate-500 mb-6">
          Usa tus credenciales internas para acceder al panel.
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
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-600">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2"
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full">
            Entrar
          </Button>
        </form>
      </Card>
    </div>
  );
}
