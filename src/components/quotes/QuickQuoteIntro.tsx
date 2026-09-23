import { CheckCircle } from "lucide-react";

type QuickQuoteIntroProps = {
  profileName: string;
};

export default function QuickQuoteIntro({ profileName }: QuickQuoteIntroProps) {
  return (
    <div className="mb-6 rounded-3xl border border-blue-100 bg-white p-6 shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Cotización rápida</p>
      <h2 className="mt-1 text-2xl font-bold text-gray-900">Cuéntanos qué vas a imprimir</h2>
      <p className="mt-2 max-w-2xl text-sm text-gray-600">
        Ingresa el material, los gramos totales del laminador y el tiempo. Costly calcula cuánto cuesta producirlo y cuánto podrías cobrar.
      </p>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
        <CheckCircle size={15} /> Perfil activo: {profileName}
      </div>
    </div>
  );
}
