import { useEffect, useMemo, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

type WaitlistStatus = "pending" | "approved" | "rejected";
type StatusFilter = WaitlistStatus | "all";

type WaitlistRow = {
  id: number;
  email: string;
  status: WaitlistStatus;
  requested_at?: string | null;
  last_request_at?: string | null;
  approved_at?: string | null;
  note?: string | null;
};

export default function WaitlistAdmin() {
  const [passcode, setPasscode] = useState("");
  const [activePasscode, setActivePasscode] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<WaitlistRow[]>([]);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!activePasscode) return;
    void fetchList();
  }, [activePasscode, statusFilter]);

  useEffect(() => {
    setNotesById((prev) => {
      const next = { ...prev };
      rows.forEach((row) => {
        const key = String(row.id);
        if (next[key] === undefined) {
          next[key] = row.note ?? "";
        }
      });
      return next;
    });
  }, [rows]);

  const fetchList = async () => {
    if (!activePasscode) {
      setError("Ingresa el passcode para continuar.");
      return;
    }
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const params = new URLSearchParams();
      params.set("status", statusFilter);
      params.set("limit", "50");
      if (search.trim()) {
        params.set("search", search.trim());
      }
      const res = await fetch(`/api/admin/waitlist?${params.toString()}` , {
        headers: {
          "x-admin-passcode": activePasscode,
        },
      });
      const raw = await res.text();
      if (!res.ok) {
        setError(raw || `HTTP ${res.status}`);
        setLoading(false);
        return;
      }
      let data: WaitlistRow[] = [];
      try {
        const parsed = raw ? JSON.parse(raw) : [];
        data = Array.isArray(parsed) ? parsed : (parsed?.data ?? []);
      } catch {
        data = [];
      }
      setRows(data);
    } catch (err) {
      setError("No se pudo cargar la lista.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: number, action: "approve" | "reject") => {
    if (!activePasscode) {
      setError("Ingresa el passcode para continuar.");
      return;
    }
    setBusy((prev) => ({ ...prev, [String(id)]: true }));
    setError("");
    setNotice("");
    const note = notesById[String(id)] ?? "";
    const payload = {
      id,
      approvedBy: approvedBy.trim() || undefined,
      note: note.trim() || undefined,
    };
    try {
      const res = await fetch(`/api/admin/waitlist/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-passcode": activePasscode,
        },
        body: JSON.stringify(payload),
      });
      const raw = await res.text();
      if (!res.ok) {
        setError(raw || `HTTP ${res.status}`);
        return;
      }
      let updated: WaitlistRow | null = null;
      try {
        const parsed = raw ? JSON.parse(raw) : null;
        updated = parsed?.data ?? null;
      } catch {
        updated = null;
      }
      const nextStatus: WaitlistStatus = action === "approve" ? "approved" : "rejected";
      if (statusFilter === "pending") {
        setRows((prev) => prev.filter((row) => row.id !== id));
      } else {
        setRows((prev) =>
          prev.map((row) =>
            row.id === id
              ? {
                  ...row,
                  status: nextStatus,
                  approved_at: action === "approve" ? updated?.approved_at ?? row.approved_at ?? null : null,
                  note: updated?.note ?? note,
                }
              : row,
          ),
        );
      }
      setNotice(action === "approve" ? "Solicitud aprobada." : "Solicitud rechazada.");
    } catch (err) {
      setError("No se pudo actualizar la solicitud.");
    } finally {
      setBusy((prev) => ({ ...prev, [String(id)]: false }));
    }
  };

  const stats = useMemo(() => ({ total: rows.length }), [rows.length]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Card className="p-6">
          <h1 className="text-2xl font-bold text-slate-900">Admin - Beta Waitlist</h1>
          <p className="mt-1 text-sm text-slate-500">Gestiona aprobaciones manuales de la beta cerrada.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-slate-500">Passcode</label>
              <input
                type="password"
                value={passcode}
                onChange={(event) => setPasscode(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Ingresa el passcode"
              />
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  const trimmed = passcode.trim();
                  if (!trimmed) {
                    setError("Ingresa el passcode para continuar.");
                    return;
                  }
                  setActivePasscode(trimmed);
                }}
              >
                Cargar lista
              </Button>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-slate-500">Aprobado por</label>
              <input
                type="text"
                value={approvedBy}
                onChange={(event) => setApprovedBy(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Tu nombre (opcional)"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-slate-500">Filtro</label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="pending">Pendientes</option>
                <option value="approved">Aprobadas</option>
                <option value="rejected">Rechazadas</option>
                <option value="all">Todas</option>
              </select>
              <Button type="button" className="w-full" onClick={() => void fetchList()}>
                Refrescar
              </Button>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-semibold uppercase text-slate-500">Buscar por email</label>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void fetchList();
                  }
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="maria@dominio.com"
              />
            </div>
            <Button type="button" onClick={() => void fetchList()}>
              Buscar
            </Button>
          </div>
          <div className="mt-4 text-xs text-slate-500">Total visibles: {stats.total}</div>
          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {notice && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {notice}
            </div>
          )}
        </Card>

        <Card className="overflow-x-auto p-6">
          {loading ? (
            <div className="text-sm text-slate-500">Cargando lista...</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-slate-500">No hay registros para mostrar.</div>
          ) : (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Solicitado</th>
                  <th className="py-2 pr-3">Nota</th>
                  <th className="py-2 pr-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const key = String(row.id);
                  return (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="py-3 pr-3 font-medium text-slate-900">{row.email}</td>
                      <td className="py-3 pr-3 text-slate-600">{row.status}</td>
                      <td className="py-3 pr-3 text-slate-600">{row.requested_at ?? "-"}</td>
                      <td className="py-3 pr-3">
                        <input
                          type="text"
                          value={notesById[key] ?? ""}
                          onChange={(event) =>
                            setNotesById((prev) => ({ ...prev, [key]: event.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                          placeholder="Nota interna"
                        />
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            className="px-3 py-1 text-xs"
                            disabled={busy[key] === true}
                            onClick={() => void handleAction(row.id, "approve")}
                          >
                            Aprobar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="px-3 py-1 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200"
                            disabled={busy[key] === true}
                            onClick={() => void handleAction(row.id, "reject")}
                          >
                            Rechazar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}

