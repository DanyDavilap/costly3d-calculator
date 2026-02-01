export type ColorOption = {
  name: string;
  hex: string;
};

type ColorPickerProps = {
  value: ColorOption | null;
  options: ColorOption[];
  onChange: (color: ColorOption) => void;
};

export default function ColorPicker({ value, options, onChange }: ColorPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((option) => {
        const isActive = value?.name === option.name && value?.hex === option.hex;
        return (
          <button
            key={option.name}
            type="button"
            onClick={() => onChange(option)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
              isActive ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
            aria-pressed={isActive}
          >
            <span
              className="h-4 w-4 rounded-full border border-gray-200"
              style={{ backgroundColor: option.hex }}
            />
            <span>{option.name}</span>
          </button>
        );
      })}
    </div>
  );
}
