type PrivateNavbarProps = {
  brandName: string;
  logo: string;
};

export default function PrivateNavbar({ brandName, logo }: PrivateNavbarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/40 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt={`${brandName} logo`} className="h-8 w-auto" />
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-sky-600">Admin</p>
            <p className="text-lg font-semibold text-slate-900">{brandName}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span className="hidden md:inline">Panel privado</span>
          <button className="rounded-full border border-slate-200 px-4 py-1.5 text-slate-700 hover:border-slate-300">
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
