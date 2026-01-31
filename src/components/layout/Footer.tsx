type FooterProps = {
  brandName: string;
};

export default function Footer({ brandName }: FooterProps) {
  return (
    <footer className="border-t border-white/50 bg-white/70 backdrop-blur px-6 py-4 text-center text-xs text-slate-500">
      © {new Date().getFullYear()} {brandName}. Acceso privado.
    </footer>
  );
}
