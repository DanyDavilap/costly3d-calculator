import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileSpreadsheet,
  PackageCheck,
  ClipboardList,
  BookOpen,
  Settings,
} from "lucide-react";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/items", label: "Items", icon: FileSpreadsheet },
  { to: "/faltantes", label: "Faltantes", icon: PackageCheck },
  { to: "/reportes", label: "Reportes", icon: ClipboardList },
  { to: "/wiki", label: "Wiki", icon: BookOpen },
  { to: "/configuracion", label: "Configuración", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="hidden min-h-screen w-60 flex-col border-r border-white/60 bg-white/70 backdrop-blur xl:flex">
      <nav className="mt-8 space-y-1 px-4">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                isActive
                  ? "bg-sky-100 text-sky-700"
                  : "text-slate-600 hover:bg-slate-100",
              ].join(" ")
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
