
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import {
  Calculator,
  History,
  Printer,
  DollarSign,
  TrendingUp,
  BarChart3,
  Clock,
  Box,
  Package,
  Save,
  Trash2,
  Lock,
  Download,
  Sparkles,
  Rocket,
  FileText,
  Factory,
  Palette,
  Settings,
} from "lucide-react";
import {
  pricingCalculator,
  PricingBreakdown,
  PricingInputs,
  PricingParams,
} from "../../utils/pricingCalculator";
import { calculateProfitability } from "../../utils/profitability";
import ColorPicker, { type ColorOption } from "../../components/ui/ColorPicker";
import {
  createPdfTheme,
  formatDate,
  formatMoney,
  renderFooter,
  renderHeader,
  type BrandSettings,
} from "../../utils/pdfTheme";
import { loadBrandSettings, saveBrandSettings } from "../../utils/brandSettings";

type PrintStatus = "cotizado" | "confirmado" | "en_produccion" | "finalizado" | "fallido";

interface FailureDetails {
  date: string;
  percentPrinted: number;
  gramsLost: number;
  gramsRecovered: number;
  materialCostLost: number;
  energyCostLost: number;
  note?: string;
}

interface HistoryRecord {
  id: string;
  date: string;
  name: string;
  productName: string;
  category: string;
  inputs: PricingInputs;
  params: PricingParams;
  breakdown: PricingBreakdown;
  total: number;
  selectedMaterialId?: string;
  materialGramsUsed?: number;
  materialType?: string | null;
  materialColorName?: string | null;
  materialBrand?: string | null;
  quantity: number;
  status: PrintStatus;
  stockDeductedGrams?: number;
  startedAt?: string | null;
  failure?: FailureDetails | null;
  stockChanges: StockChange[];
}

interface StockChange {
  date: string;
  timestamp: string;
  change: number;
  stockAfter: number;
  reason: "sold" | "restock";
  type: "sale" | "restock";
}

interface MaterialSpool {
  id: string;
  displayName: string;
  brand: string;
  materialType: string;
  color: ColorOption | null;
  gramsAvailable: number;
  costPerKg?: number;
  isDemo?: boolean;
}

const PARAMS_STORAGE_KEY = "calculatorBaseParams";
const HISTORY_STORAGE_KEY = "toyRecords";
const STOCK_STORAGE_KEY = "stockByProduct";
const CATEGORY_STORAGE_KEY = "calculatorCategory";
const MATERIAL_STOCK_KEY = "materialStock";
const FREE_PRODUCT_LIMIT = 3;
const IS_PRO_SANDBOX = true;
const SHOW_PROFITABILITY_SECTION = false;
const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const MATERIAL_OPTIONS = ["PLA", "PETG", "ABS", "TPU", "Resin", "Otro..."];
const BRAND_OPTIONS = [
  "Bambu Lab",
  "Elegoo",
  "Printalot",
  "Sunlu",
  "eSUN",
  "Ecofila",
  "Creality",
  "3N3",
  "Grilon3",
  "Otro...",
];
const COLOR_OPTIONS: ColorOption[] = [
  { name: "Negro", hex: "#111827" },
  { name: "Blanco", hex: "#F8FAFC" },
  { name: "Gris", hex: "#9CA3AF" },
  { name: "Rojo", hex: "#EF4444" },
  { name: "Naranja", hex: "#F97316" },
  { name: "Amarillo", hex: "#FACC15" },
  { name: "Verde", hex: "#22C55E" },
  { name: "Azul", hex: "#3B82F6" },
  { name: "Celeste", hex: "#38BDF8" },
  { name: "Violeta", hex: "#8B5CF6" },
  { name: "Rosa", hex: "#EC4899" },
  { name: "Transparente", hex: "#E2E8F0" },
];

const DEFAULT_PARAMS: PricingParams = {
  filamentCostPerKg: 30000,
  powerWatts: 80,
  energyCostPerKwh: 100,
  laborPerHour: 1000,
  wearPercent: 5,
  operationalPercent: 5,
  profitPercent: 40,
};

const loadStoredParams = (): PricingParams => {
  if (typeof window === "undefined") return DEFAULT_PARAMS;
  const saved = localStorage.getItem(PARAMS_STORAGE_KEY);
  if (!saved) return DEFAULT_PARAMS;

  try {
    const parsed = JSON.parse(saved);
    return { ...DEFAULT_PARAMS, ...parsed };
  } catch (error) {
    console.error("No se pudieron cargar los parametros base", error);
    return DEFAULT_PARAMS;
  }
};

interface PricingResult {
  timeMinutes: number;
  materialGrams: number;
  breakdown: PricingBreakdown;
}

const toFixedString = (value: number) => (Number.isFinite(value) ? value.toFixed(0) : "0");

const getProductKey = (name: string, category: string) => {
  const safeName = name.trim().toLowerCase();
  const safeCategory = category.trim().toLowerCase();
  const normalizedCategory = safeCategory || "general";
  return safeName ? `${normalizedCategory}::${safeName}` : normalizedCategory;
};

const buildStockMap = (records: HistoryRecord[]) => {
  return records.reduce<Record<string, number>>((acc, record) => {
    const key = getProductKey(record.name, record.category);
    const current = acc[key] ?? 0;
    const available = record.status === "cotizado" ? record.quantity || 0 : 0;
    acc[key] = current + available;
    return acc;
  }, {});
};

const normalizeHistoryRecord = (
  raw: HistoryRecord | null,
  fallbackParams: PricingParams
): HistoryRecord | null => {
  if (!raw) return null;
  const inputs = raw.inputs ?? {
    timeMinutes: (raw as unknown as { time?: number }).time ?? 0,
    materialGrams: (raw as unknown as { material?: number }).material ?? 0,
    assemblyMinutes: (raw as unknown as { assemblyMinutes?: number }).assemblyMinutes ?? 0,
  };
  const params = raw.params ?? fallbackParams;
  const breakdown = raw.breakdown ?? pricingCalculator({ inputs, params });
  const quantity =
    typeof raw.quantity === "number" && Number.isFinite(raw.quantity) && raw.quantity >= 0 ? raw.quantity : 1;
  const legacyStatus = String(
    raw.status ?? ((raw as unknown as { sold?: boolean }).sold ? "sold" : "draft"),
  );
  const status: PrintStatus =
    legacyStatus === "sold" || legacyStatus === "confirmado"
      ? "confirmado"
      : legacyStatus === "draft"
        ? "cotizado"
        : legacyStatus === "produced" || legacyStatus === "producido" || legacyStatus === "finalizado"
          ? "finalizado"
          : legacyStatus === "en_produccion"
            ? "en_produccion"
            : legacyStatus === "fallido"
              ? "fallido"
              : "cotizado";
  const stockChanges = (raw.stockChanges ?? []).map((change: StockChange) => {
    const inferredReason = change.reason ?? (change.change < 0 ? "sold" : "restock");
    return {
      ...change,
      reason: inferredReason,
      timestamp: change.timestamp ?? change.date ?? new Date().toISOString(),
      type: change.type ?? (inferredReason === "sold" ? "sale" : "restock"),
    };
  });

  const normalizedCategory =
    typeof raw.category === "string" && raw.category.trim().length > 0 ? raw.category : "General";
  const materialGramsUsed =
    typeof raw.materialGramsUsed === "number" && Number.isFinite(raw.materialGramsUsed)
      ? raw.materialGramsUsed
      : inputs.materialGrams * quantity;

  const rawFailure = (raw as HistoryRecord).failure ?? null;
  const failure =
    rawFailure && typeof rawFailure === "object"
      ? {
          ...rawFailure,
          percentPrinted:
            typeof (rawFailure as FailureDetails).percentPrinted === "number"
              ? (rawFailure as FailureDetails).percentPrinted
              : typeof (rawFailure as unknown as { percentFailed?: number }).percentFailed === "number"
                ? (rawFailure as unknown as { percentFailed: number }).percentFailed
                : 0,
        }
      : null;
  const stockDeductedGrams =
    typeof (raw as HistoryRecord).stockDeductedGrams === "number"
      ? (raw as HistoryRecord).stockDeductedGrams
      : status === "finalizado"
        ? materialGramsUsed
        : status === "fallido"
          ? failure?.gramsLost ?? 0
          : 0;

  return {
    id: raw.id ?? Date.now().toString(),
    date: raw.date ?? new Date().toLocaleDateString("es-AR"),
    name: raw.name ?? raw.productName ?? "",
    productName: raw.productName ?? raw.name ?? "",
    category: normalizedCategory,
    inputs,
    params,
    breakdown,
    total: typeof raw.total === "number" ? raw.total : breakdown.finalPrice,
    selectedMaterialId: raw.selectedMaterialId ?? "",
    materialGramsUsed,
    materialType: (raw as HistoryRecord).materialType ?? null,
    materialColorName: (raw as HistoryRecord).materialColorName ?? null,
    materialBrand: (raw as HistoryRecord).materialBrand ?? null,
    quantity,
    status,
    stockDeductedGrams,
    startedAt: (raw as HistoryRecord).startedAt ?? null,
    failure,
    stockChanges,
  };
};

const loadStoredRecords = (fallbackParams: PricingParams): HistoryRecord[] => {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((record) => normalizeHistoryRecord(record, fallbackParams))
      .filter((record): record is HistoryRecord => Boolean(record));
  } catch (error) {
    console.error("No se pudo cargar el historial", error);
    return [];
  }
};

const loadMaterialStock = (): MaterialSpool[] => {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem(MATERIAL_STOCK_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    const raw = parsed
      .map((spool) => ({
        id: String(spool.id ?? Date.now().toString()),
        displayName: String(spool.displayName ?? spool.name ?? ""),
        brand: String(spool.brand ?? ""),
        materialType: String(spool.materialType ?? ""),
        color: resolveColorOption(spool.color),
        gramsAvailable: Number.isFinite(spool.gramsAvailable) ? Number(spool.gramsAvailable) : 0,
        costPerKg: Number.isFinite(spool.costPerKg) ? Number(spool.costPerKg) : undefined,
        isDemo: Boolean(spool.isDemo),
      }))
      .filter((spool) => Boolean(spool.displayName));
    return ensureUniqueDisplayNames(raw);
  } catch (error) {
    return [];
  }
};

function resolveColorOption(value: unknown): ColorOption | null {
  if (!value) return null;
  if (typeof value === "string") {
    const match = COLOR_OPTIONS.find((option) => option.name.toLowerCase() === value.toLowerCase());
    return match ?? { name: value, hex: "#94A3B8" };
  }
  if (typeof value === "object") {
    const maybe = value as { name?: string; hex?: string };
    if (maybe.name && maybe.hex) {
      return { name: maybe.name, hex: maybe.hex };
    }
  }
  return null;
}

function buildDisplayNameBase(materialType: string, colorName: string, brand: string) {
  const safeMaterial = materialType.trim() || "Material";
  const safeColor = colorName.trim() || "Color";
  const safeBrand = brand.trim() || "Marca";
  return `${safeMaterial} · ${safeColor} · ${safeBrand}`;
}

function ensureUniqueDisplayNames(stock: MaterialSpool[]) {
  const counts = new Map<string, number>();
  return stock.map((spool) => {
    const base =
      spool.displayName?.trim() ||
      buildDisplayNameBase(spool.materialType, spool.color?.name ?? "", spool.brand);
    const normalized = base.trim() || "Spool";
    const nextCount = (counts.get(normalized) ?? 0) + 1;
    counts.set(normalized, nextCount);
    const displayName = nextCount === 1 ? normalized : `${normalized} #${nextCount}`;
    return { ...spool, displayName };
  });
}

const isFiniteNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value);

const isValidInputs = (inputs: PricingInputs) =>
  isFiniteNumber(inputs.timeMinutes) &&
  inputs.timeMinutes > 0 &&
  isFiniteNumber(inputs.materialGrams) &&
  inputs.materialGrams >= 0 &&
  isFiniteNumber(inputs.assemblyMinutes) &&
  inputs.assemblyMinutes >= 0;

const isValidParams = (params: PricingParams) =>
  Object.values(params).every((value) => isFiniteNumber(value) && value >= 0);

const isValidBreakdown = (breakdown: PricingBreakdown) =>
  Object.values(breakdown).every((value) => isFiniteNumber(value));

type DashboardProps = {
  onOpenProModal?: (source?: "limit" | "cta") => void;
};

type DashboardSection =
  | "calculator"
  | "quotations"
  | "production"
  | "stock"
  | "reports"
  | "profitability"
  | "branding"
  | "settings";

function Dashboard({ onOpenProModal }: DashboardProps) {
  const handleOpenProModal = onOpenProModal ?? (() => {});
  const [activeSection, setActiveSection] = useState<DashboardSection>("calculator");
  const [records, setRecords] = useState<HistoryRecord[]>(() => loadStoredRecords(loadStoredParams()));

  const [toyName, setToyName] = useState("");
  const [category, setCategory] = useState(() => {
    if (typeof window === "undefined") return "General";
    const stored = localStorage.getItem(CATEGORY_STORAGE_KEY) || "";
    return stored.trim() || "General";
  });
  const [printHours, setPrintHours] = useState("");
  const [printMinutes, setPrintMinutes] = useState("");
  const [assemblyHours, setAssemblyHours] = useState("");
  const [assemblyMinutes, setAssemblyMinutes] = useState("");
  const [materialWeight, setMaterialWeight] = useState("");
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [stockError, setStockError] = useState("");
  const [materialStock, setMaterialStock] = useState<MaterialSpool[]>(() => loadMaterialStock());
  const [params, setParams] = useState<PricingParams>(loadStoredParams);

  const [result, setResult] = useState<PricingResult | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<HistoryRecord | null>(null);
  const [stockModal, setStockModal] = useState({
    open: false,
    available: 0,
    required: 0,
    recordId: null as string | null,
    selectedMaterialId: "",
    resumeFailure: false,
  });
  const [isFailureModalOpen, setIsFailureModalOpen] = useState(false);
  const [failureTarget, setFailureTarget] = useState<HistoryRecord | null>(null);
  const [failurePercent, setFailurePercent] = useState(50);
  const [failureNote, setFailureNote] = useState("");
  const isCalculatingRef = useRef(false);
  const lastSavedSignatureRef = useRef<string | null>(null);
  const [saveBanner, setSaveBanner] = useState<{
    type: "success" | "error";
    message: string;
    description?: string;
  } | null>(null);
  const saveBannerTimerRef = useRef<number | null>(null);
  const [brand] = useState<BrandSettings>(() => loadBrandSettings());
  const now = new Date();
  const [reportMonth, setReportMonth] = useState(now.getMonth());
  const [reportYear, setReportYear] = useState(now.getFullYear());
  const [stockForm, setStockForm] = useState({
    id: "",
    brandOption: "",
    brandOther: "",
    materialOption: "",
    materialOther: "",
    color: null as ColorOption | null,
    gramsAvailable: "",
    costPerKg: "",
  });
  const [adjustTargetId, setAdjustTargetId] = useState("");
  const [adjustGrams, setAdjustGrams] = useState("");
  const [stockNotice, setStockNotice] = useState("");
  const [isStockFormHighlighted, setIsStockFormHighlighted] = useState(false);
  const stockFormRef = useRef<HTMLDivElement | null>(null);
  const materialSelectRef = useRef<HTMLSelectElement | null>(null);
  const stockHighlightTimerRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem(PARAMS_STORAGE_KEY, JSON.stringify(params));
  }, [params]);

  useEffect(() => {
    localStorage.setItem(CATEGORY_STORAGE_KEY, category.trim() || "General");
  }, [category]);

  useEffect(() => {
    saveBrandSettings(brand);
  }, [brand]);

  useEffect(() => {
    return () => {
      if (stockHighlightTimerRef.current) {
        window.clearTimeout(stockHighlightTimerRef.current);
        stockHighlightTimerRef.current = null;
      }
      if (saveBannerTimerRef.current) {
        window.clearTimeout(saveBannerTimerRef.current);
        saveBannerTimerRef.current = null;
      }
    };
  }, []);

  const persistMaterialStock = (nextStock: MaterialSpool[]) => {
    localStorage.setItem(MATERIAL_STOCK_KEY, JSON.stringify(nextStock));
    setMaterialStock(nextStock);
  };

  const isFreeLimitReached = records.length >= FREE_PRODUCT_LIMIT;
  const showStockOnboarding = materialStock.length === 0;
  const showStockBanner =
    showStockOnboarding &&
    (activeSection === "calculator" || activeSection === "quotations" || activeSection === "production");

  const profitability = useMemo(
    () => calculateProfitability(records.filter((record) => record.status !== "fallido")),
    [records],
  );
  const hasProfitabilityData = profitability.entries.length > 0;
  const isProEnabled = IS_PRO_SANDBOX;
  const previewTopByProfit =
    profitability.topByProfit.length > 0
      ? profitability.topByProfit
      : [
          { key: "preview-profit-1", productName: "—", category: "—", revenue: 0, cost: 0, profit: 0, margin: 0 },
          { key: "preview-profit-2", productName: "—", category: "—", revenue: 0, cost: 0, profit: 0, margin: 0 },
          { key: "preview-profit-3", productName: "—", category: "—", revenue: 0, cost: 0, profit: 0, margin: 0 },
        ];
  const previewTopByMargin =
    profitability.topByMargin.length > 0
      ? profitability.topByMargin
      : [
          { key: "preview-margin-1", productName: "—", category: "—", revenue: 0, cost: 0, profit: 0, margin: 0 },
          { key: "preview-margin-2", productName: "—", category: "—", revenue: 0, cost: 0, profit: 0, margin: 0 },
          { key: "preview-margin-3", productName: "—", category: "—", revenue: 0, cost: 0, profit: 0, margin: 0 },
        ];
  const previewRecentQuotes =
    profitability.recentQuotes.length > 0
      ? profitability.recentQuotes
      : [
          {
            id: "preview-quote-1",
            date: "—",
            productName: "—",
            category: "—",
            revenue: 0,
            cost: 0,
            profit: 0,
            margin: 0,
            timestamp: 0,
          },
          {
            id: "preview-quote-2",
            date: "—",
            productName: "—",
            category: "—",
            revenue: 0,
            cost: 0,
            profit: 0,
            margin: 0,
            timestamp: 0,
          },
          {
            id: "preview-quote-3",
            date: "—",
            productName: "—",
            category: "—",
            revenue: 0,
            cost: 0,
            profit: 0,
            margin: 0,
            timestamp: 0,
          },
        ];

  const formatPercent = (value: number) => (Number.isFinite(value) ? `${value.toFixed(1)}%` : "0%");

  const resetStockForm = () => {
    setStockForm({
      id: "",
      brandOption: "",
      brandOther: "",
      materialOption: "",
      materialOther: "",
      color: null,
      gramsAvailable: "",
      costPerKg: "",
    });
  };

  const handleAddSpoolClick = () => {
    resetStockForm();
    stockFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => materialSelectRef.current?.focus(), 250);
    setIsStockFormHighlighted(true);
    if (stockHighlightTimerRef.current) {
      window.clearTimeout(stockHighlightTimerRef.current);
    }
    stockHighlightTimerRef.current = window.setTimeout(() => {
      setIsStockFormHighlighted(false);
    }, 600);
  };

  const resolveCustomOption = (option: string, otherValue: string) =>
    option === "Otro..." ? otherValue.trim() : option.trim();

  const getUniqueDisplayName = (baseName: string, currentId?: string) => {
    const existing = materialStock
      .filter((spool) => spool.id !== currentId)
      .map((spool) => spool.displayName);
    let suffix = 1;
    let candidate = baseName;
    while (existing.includes(candidate)) {
      suffix += 1;
      candidate = `${baseName} #${suffix}`;
    }
    return candidate;
  };

  const getSelectedMaterialSnapshot = () => {
    if (!selectedMaterialId) {
      return { materialType: null, materialColorName: null, materialBrand: null };
    }
    const spool = materialStock.find((item) => item.id === selectedMaterialId);
    return {
      materialType: spool?.materialType ?? null,
      materialColorName: spool?.color?.name ?? null,
      materialBrand: spool?.brand ?? null,
    };
  };

  const resolveMaterialSnapshotFromRecord = (record: HistoryRecord) => {
    const fallbackSpool = record.selectedMaterialId
      ? materialStock.find((item) => item.id === record.selectedMaterialId)
      : undefined;
    const materialType = record.materialType ?? fallbackSpool?.materialType ?? "";
    const colorName = record.materialColorName ?? fallbackSpool?.color?.name ?? "";
    const brandName = record.materialBrand ?? fallbackSpool?.brand ?? "";
    const grams = typeof record.materialGramsUsed === "number" ? record.materialGramsUsed : 0;
    if (!materialType && !colorName && !brandName) {
      return null;
    }
    return { materialType, colorName, brandName, grams };
  };

  const getMaterialDisplayFromRecord = (record: HistoryRecord) => {
    const snapshot = resolveMaterialSnapshotFromRecord(record);
    if (!snapshot) {
      return "Material: —";
    }
    return `Material: ${snapshot.materialType || "—"} · ${snapshot.colorName || "—"} · ${
      snapshot.brandName || "—"
    } — ${snapshot.grams.toFixed(0)} g`;
  };

  const getStatusBadge = (status: HistoryRecord["status"]) => {
    switch (status) {
      case "confirmado":
        return { label: "Confirmado", className: "bg-blue-100 text-blue-700" };
      case "en_produccion":
        return { label: "En producción", className: "bg-indigo-100 text-indigo-700" };
      case "finalizado":
        return { label: "Finalizado", className: "bg-green-100 text-green-700" };
      case "fallido":
        return { label: "Fallido", className: "bg-red-100 text-red-700" };
      default:
        return { label: "Cotizado", className: "bg-yellow-100 text-yellow-700" };
    }
  };

  const handleSaveSpool = () => {
    const grams = Number.parseFloat(stockForm.gramsAvailable);
    const resolvedBrand = resolveCustomOption(stockForm.brandOption, stockForm.brandOther);
    const resolvedMaterial = resolveCustomOption(stockForm.materialOption, stockForm.materialOther);
    if (!resolvedBrand || !resolvedMaterial || !stockForm.color) {
      setStockNotice("Completá marca, material y color.");
      return;
    }
    if (!Number.isFinite(grams) || grams < 0) {
      setStockNotice("Ingresá gramos disponibles válidos.");
      return;
    }
    const costPerKg = Number.parseFloat(stockForm.costPerKg);
    const baseName = buildDisplayNameBase(resolvedMaterial, stockForm.color.name, resolvedBrand);
    const displayName = getUniqueDisplayName(baseName, stockForm.id);
    const existing = stockForm.id ? materialStock.find((spool) => spool.id === stockForm.id) : undefined;
    const nextSpool: MaterialSpool = {
      id: stockForm.id || Date.now().toString(),
      displayName,
      brand: resolvedBrand,
      materialType: resolvedMaterial,
      color: stockForm.color,
      gramsAvailable: grams,
      costPerKg: Number.isFinite(costPerKg) ? costPerKg : undefined,
      isDemo: existing?.isDemo ?? false,
    };
    const nextStock = stockForm.id
      ? materialStock.map((spool) => (spool.id === stockForm.id ? nextSpool : spool))
      : [nextSpool, ...materialStock];
    persistMaterialStock(nextStock);
    resetStockForm();
    setStockNotice("");
  };

  const handleEditSpool = (spool: MaterialSpool) => {
    const brandOption = BRAND_OPTIONS.includes(spool.brand) ? spool.brand : "Otro...";
    const materialOption = MATERIAL_OPTIONS.includes(spool.materialType) ? spool.materialType : "Otro...";
    setStockForm({
      id: spool.id,
      brandOption,
      brandOther: brandOption === "Otro..." ? spool.brand : "",
      materialOption,
      materialOther: materialOption === "Otro..." ? spool.materialType : "",
      color: spool.color,
      gramsAvailable: spool.gramsAvailable.toString(),
      costPerKg: spool.costPerKg?.toString() ?? "",
    });
  };

  const handleAdjustStock = (direction: "add" | "subtract") => {
    const target = materialStock.find((spool) => spool.id === adjustTargetId);
    const grams = Number.parseFloat(adjustGrams);
    if (!target || !Number.isFinite(grams) || grams <= 0) {
      setStockNotice("Seleccioná un spool y un gramaje válido.");
      return;
    }
    const delta = direction === "add" ? grams : -grams;
    const nextValue = target.gramsAvailable + delta;
    if (nextValue < 0) {
      setStockNotice(
        `No podés dejar el stock en negativo. Disponible ${target.gramsAvailable}g.`,
      );
      return;
    }
    const nextStock = materialStock.map((spool) =>
      spool.id === target.id ? { ...spool, gramsAvailable: nextValue } : spool,
    );
    persistMaterialStock(nextStock);
    setAdjustGrams("");
    setStockNotice("");
  };

  const handleCreateDemoStock = () => {
    if (materialStock.length > 0) return;
    const demoSpool: MaterialSpool = {
      id: Date.now().toString(),
      displayName: "PLA · Gris · Genérico",
      brand: "Genérico",
      materialType: "PLA",
      color: COLOR_OPTIONS.find((option) => option.name === "Gris") ?? { name: "Gris", hex: "#9CA3AF" },
      gramsAvailable: 1000,
      costPerKg: undefined,
      isDemo: true,
    };
    persistMaterialStock(ensureUniqueDisplayNames([demoSpool]));
  };

  const showSaveBanner = (next: { type: "success" | "error"; message: string; description?: string }) => {
    setSaveBanner(next);
    if (saveBannerTimerRef.current) {
      window.clearTimeout(saveBannerTimerRef.current);
    }
    saveBannerTimerRef.current = window.setTimeout(() => {
      setSaveBanner(null);
      saveBannerTimerRef.current = null;
    }, 2800);
  };

  const buildRecordSignature = (inputs: PricingInputs, paramsSnapshot: PricingParams) =>
    JSON.stringify({
      name: toyName.trim() || "Sin nombre",
      category: category.trim() || "General",
      materialId: selectedMaterialId || "",
      inputs,
      params: paramsSnapshot,
    });

  const persistHistory = (
    newRecords: HistoryRecord[],
    options?: {
      signature?: string;
      allowDuplicateSignature?: boolean;
    }
  ): boolean => {
    // Single source of truth: history persistence + free-limit checks live only here.
    const isGrowing = newRecords.length > records.length;
    if (isGrowing && records.length >= FREE_PRODUCT_LIMIT) {
      // Punto único de entrada PRO: mismo modal para límite FREE y CTA manual.
      handleOpenProModal("limit");
      return false;
    }
    if (isGrowing && options?.signature && !options.allowDuplicateSignature) {
      if (options.signature === lastSavedSignatureRef.current) {
        return false;
      }
    }
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newRecords));
    localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(buildStockMap(newRecords)));
    setRecords(newRecords);
    if (isGrowing && options?.signature && !options.allowDuplicateSignature) {
      lastSavedSignatureRef.current = options.signature;
    }
    return true;
  };

  const buildPdfDataFromResult = () => {
    if (!result) return null;
    const productName = toyName || "Producto";
    const categoryName = category.trim() || "General";
    return {
      productName,
      categoryName,
      dateLabel: formatDate(new Date()),
      breakdown: {
        materiales: result.breakdown.materialCost,
        energia: result.breakdown.energyCost,
        manoDeObra: result.breakdown.laborCost,
        usoYMantenimiento: result.breakdown.wearCost + result.breakdown.operatingCost,
        total: result.breakdown.finalPrice,
      },
    };
  };

  type PdfData = {
    productName: string;
    categoryName: string;
    dateLabel: string;
    breakdown: {
      materiales: number;
      energia: number;
      manoDeObra: number;
      usoYMantenimiento: number;
      total: number;
    };
  };

  const buildPdfDataFromRecord = (record: HistoryRecord): PdfData => ({
    productName: record.productName || record.name || "Producto",
    categoryName: record.category || "General",
    dateLabel: record.date || formatDate(new Date()),
    breakdown: {
      materiales: record.breakdown.materialCost,
      energia: record.breakdown.energyCost,
      manoDeObra: record.breakdown.laborCost,
      usoYMantenimiento: record.breakdown.wearCost + record.breakdown.operatingCost,
      total: record.breakdown.finalPrice,
    },
  });

  const renderQuotationPdf = ({
    productName,
    categoryName,
    dateLabel,
    breakdown,
  }: PdfData) => {
    if (!breakdown) return;

    const doc = new jsPDF();
    const theme = createPdfTheme(brand);
    const pageWidth = doc.internal.pageSize.getWidth();
    const rightEdge = pageWidth - theme.marginX;
    let cursorY = renderHeader(doc, brand, theme, "Cotización de producto");

    const clientBreakdown = [
      { label: "Materiales", value: breakdown.materiales },
      { label: "Consumo energético", value: breakdown.energia },
      { label: "Mano de obra", value: breakdown.manoDeObra },
      { label: "Uso y mantenimiento de equipo", value: breakdown.usoYMantenimiento },
    ];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(theme.textSize);
    doc.setTextColor(17, 24, 39);
    doc.text(`Producto: ${productName}`, theme.marginX, cursorY);
    cursorY += theme.lineGap;
    doc.text(`Categoría: ${categoryName}`, theme.marginX, cursorY);
    cursorY += theme.lineGap;
    doc.text(`Fecha: ${dateLabel}`, theme.marginX, cursorY);
    cursorY += 6;
    doc.setDrawColor(theme.accent.r, theme.accent.g, theme.accent.b);
    doc.setLineWidth(0.4);
    doc.line(theme.marginX, cursorY, rightEdge, cursorY);
    cursorY += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(theme.textSize);
    doc.text("Desglose", theme.marginX, cursorY);
    cursorY += theme.lineGap;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(theme.textSize);
    clientBreakdown.forEach((item) => {
      doc.text(item.label, theme.marginX, cursorY);
      doc.setFont("helvetica", "bold");
      doc.text(formatMoney(item.value), rightEdge, cursorY, { align: "right" });
      doc.setFont("helvetica", "normal");
      cursorY += theme.lineGap;
    });
    cursorY += 2;
    doc.setDrawColor(theme.accent.r, theme.accent.g, theme.accent.b);
    doc.setLineWidth(0.4);
    doc.line(theme.marginX, cursorY, rightEdge, cursorY);
    cursorY += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(theme.accent.r, theme.accent.g, theme.accent.b);
    doc.text("TOTAL FINAL SUGERIDO", theme.marginX, cursorY);
    doc.setFontSize(theme.totalSize);
    doc.text(formatMoney(breakdown.total), rightEdge, cursorY + 1, { align: "right" });
    cursorY += 12;

    renderFooter(doc, brand, theme);

    const fileSafeName = (productName || "producto")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    doc.save(`cotizacion-${fileSafeName || "producto"}.pdf`);
  };

  const attemptPdfExport = (data: PdfData, allowExport: boolean) => {
    console.log("PDF_EXPORT_ATTEMPT");
    if (!allowExport) {
      console.log("PDF_EXPORT_BLOCKED_FREE");
      return;
    }
    renderQuotationPdf(data);
    console.log("PDF_EXPORT_SUCCESS");
  };

  const exportQuotationPdf = () => {
    const data = buildPdfDataFromResult();
    if (!data) return;
    const allowExport = !isFreeLimitReached || IS_PRO_SANDBOX;
    attemptPdfExport(data, allowExport);
  };

  const exportRecordPdf = (record: HistoryRecord) => {
    const data = buildPdfDataFromRecord(record);
    attemptPdfExport(data, IS_PRO_SANDBOX);
  };

  const exportMonthlyReportPdf = () => {
    const doc = new jsPDF();
    const theme = createPdfTheme(brand);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const rightEdge = pageWidth - theme.marginX;

    let cursorY = renderHeader(
      doc,
      brand,
      theme,
      "Reporte mensual",
      `${reportMonthLabel} ${reportYear}`.trim(),
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(theme.textSize);
    doc.setTextColor(17, 24, 39);
    doc.text("Resumen", theme.marginX, cursorY);
    cursorY += theme.lineGap;

    const kpis = [
      { label: "Total de cotizaciones", value: monthlyRecords.length.toString() },
      { label: "Total de ingresos", value: formatMoney(monthlyTotal) },
      { label: "Promedio por cotización", value: formatMoney(monthlyAverage) },
      { label: "Pérdidas por fallas", value: formatMoney(monthlyFailureLosses) },
      { label: "Gramos desperdiciados", value: `${monthlyFailureGrams.toFixed(0)} g` },
      { label: "Tasa de fallas", value: `${monthlyFailureRate.toFixed(1)}%` },
    ];

    kpis.forEach((item) => {
      doc.setFont("helvetica", "normal");
      doc.text(item.label, theme.marginX, cursorY);
      doc.setFont("helvetica", "bold");
      doc.text(item.value, rightEdge, cursorY, { align: "right" });
      cursorY += theme.lineGap;
    });

    cursorY += 4;
    doc.setDrawColor(theme.accent.r, theme.accent.g, theme.accent.b);
    doc.setLineWidth(0.4);
    doc.line(theme.marginX, cursorY, rightEdge, cursorY);
    cursorY += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Consumo de material (mes)", theme.marginX, cursorY);
    cursorY += theme.lineGap;

    if (totalMaterialGrams <= 0) {
      doc.setFont("helvetica", "normal");
      doc.text("Sin datos de consumo para este mes.", theme.marginX, cursorY);
      cursorY += theme.lineGap;
    } else {
      doc.setFont("helvetica", "normal");
      doc.text("Total gramos usados", theme.marginX, cursorY);
      doc.setFont("helvetica", "bold");
      doc.text(`${totalMaterialGrams.toFixed(0)} g`, rightEdge, cursorY, { align: "right" });
      cursorY += theme.lineGap;

      doc.setFont("helvetica", "bold");
      doc.text("Por material", theme.marginX, cursorY);
      cursorY += theme.lineGap;
      materialConsumptionByMaterialList.slice(0, 5).forEach((item) => {
        doc.setFont("helvetica", "normal");
        doc.text(`• ${item.material}`, theme.marginX, cursorY);
        doc.setFont("helvetica", "bold");
        doc.text(`${item.grams.toFixed(0)} g`, rightEdge, cursorY, { align: "right" });
        cursorY += theme.lineGap;
      });

      cursorY += 2;
      doc.setFont("helvetica", "bold");
      doc.text("Top colores", theme.marginX, cursorY);
      cursorY += theme.lineGap;
      materialConsumptionByColorList.slice(0, 3).forEach((item) => {
        doc.setFont("helvetica", "normal");
        doc.text(`• ${item.color}`, theme.marginX, cursorY);
        doc.setFont("helvetica", "bold");
        doc.text(`${item.grams.toFixed(0)} g`, rightEdge, cursorY, { align: "right" });
        cursorY += theme.lineGap;
      });

      if (materialConsumptionByBrandList.length > 0) {
        cursorY += 2;
        doc.setFont("helvetica", "bold");
        doc.text("Top marcas", theme.marginX, cursorY);
        cursorY += theme.lineGap;
        materialConsumptionByBrandList.slice(0, 3).forEach((item) => {
          doc.setFont("helvetica", "normal");
          doc.text(`• ${item.brand}`, theme.marginX, cursorY);
          doc.setFont("helvetica", "bold");
          doc.text(`${item.grams.toFixed(0)} g`, rightEdge, cursorY, { align: "right" });
          cursorY += theme.lineGap;
        });
      }
    }

    cursorY += 6;
    doc.setDrawColor(theme.accent.r, theme.accent.g, theme.accent.b);
    doc.setLineWidth(0.4);
    doc.line(theme.marginX, cursorY, rightEdge, cursorY);
    cursorY += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Top 5 productos", theme.marginX, cursorY);
    cursorY += theme.lineGap;

    if (topProducts.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.text("Sin datos para este mes.", theme.marginX, cursorY);
      cursorY += theme.lineGap;
    } else {
      topProducts.forEach((item) => {
        doc.setFont("helvetica", "normal");
        doc.text(`• ${item.name}`, theme.marginX, cursorY);
        doc.setFont("helvetica", "bold");
        doc.text(formatMoney(item.total), rightEdge, cursorY, { align: "right" });
        cursorY += theme.lineGap;
      });
    }

    cursorY += 6;
    doc.setDrawColor(theme.accent.r, theme.accent.g, theme.accent.b);
    doc.setLineWidth(0.4);
    doc.line(theme.marginX, cursorY, rightEdge, cursorY);
    cursorY += 8;

    const colDate = theme.marginX;
    const colProduct = colDate + 26;
    const colCategory = colProduct + 62;
    const colQty = rightEdge - 40;
    const colTotal = rightEdge;

    const renderTableHeader = () => {
      doc.setFont("helvetica", "bold");
      doc.text("Fecha", colDate, cursorY);
      doc.text("Producto", colProduct, cursorY);
      doc.text("Categoría", colCategory, cursorY);
      doc.text("Cant.", colQty, cursorY, { align: "right" });
      doc.text("Total", colTotal, cursorY, { align: "right" });
      cursorY += theme.lineGap;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(theme.marginX, cursorY, rightEdge, cursorY);
      cursorY += 6;
    };

    const ensureSpace = (height: number) => {
      if (cursorY + height < pageHeight - 24) return;
      doc.addPage();
      cursorY = renderHeader(
        doc,
        brand,
        theme,
        "Reporte mensual",
        `${reportMonthLabel} ${reportYear}`.trim(),
      );
      renderTableHeader();
    };

    renderTableHeader();

    monthlyReportRecords.forEach((record) => {
      ensureSpace(theme.lineGap + 6);
      const parsedDate = parseRecordDate(record.date);
      const dateLabel = parsedDate ? formatDate(parsedDate) : record.date;
      const totalValue = record.status === "fallido" ? 0 : record.total || record.breakdown.finalPrice;
      doc.setFont("helvetica", "normal");
      doc.text(dateLabel, colDate, cursorY);
      doc.text(record.productName || record.name || "Producto", colProduct, cursorY, { maxWidth: 60 });
      doc.text(record.category || "General", colCategory, cursorY, { maxWidth: 40 });
      doc.text(String(record.quantity || 1), colQty, cursorY, { align: "right" });
      doc.text(formatMoney(totalValue), colTotal, cursorY, { align: "right" });
      cursorY += theme.lineGap;
    });

    renderFooter(doc, brand, theme);
    doc.save(`reporte-${reportYear}-${String(reportMonth + 1).padStart(2, "0")}.pdf`);
  };

  const getInputs = () => {
    const timeMinutes = totalPrintMinutes();
    const assemblyMinutesTotal = totalAssemblyMinutes();
    const materialGrams = parseFloat(materialWeight);

    if (timeMinutes <= 0 || Number.isNaN(materialGrams)) {
      return null;
    }

    return { timeMinutes, materialGrams, assemblyMinutes: assemblyMinutesTotal };
  };

  const buildRecord = ({
    inputs,
    breakdown,
    paramsSnapshot,
    recordId,
  }: {
    inputs: PricingInputs;
    breakdown: PricingBreakdown;
    paramsSnapshot: PricingParams;
    recordId?: string;
  }): HistoryRecord => {
    const materialSnapshot = getSelectedMaterialSnapshot();
    return {
    id: recordId ?? Date.now().toString(),
    date: new Date().toLocaleDateString("es-AR"),
    name: toyName || "Sin nombre",
    productName: toyName || "Sin nombre",
    category: category.trim() || "General",
    inputs,
    params: paramsSnapshot,
    breakdown,
    total: breakdown.finalPrice,
    selectedMaterialId: selectedMaterialId || "",
    materialGramsUsed: selectedMaterialId ? inputs.materialGrams * 1 : 0,
    materialType: selectedMaterialId ? materialSnapshot.materialType : null,
    materialColorName: selectedMaterialId ? materialSnapshot.materialColorName : null,
    materialBrand: selectedMaterialId ? materialSnapshot.materialBrand : null,
    quantity: 1,
    status: "cotizado",
    stockDeductedGrams: 0,
    startedAt: null,
    failure: null,
    stockChanges: [],
    };
  };

  const saveCalculation = ({
    inputs,
    breakdown,
    paramsSnapshot,
    mode,
  }: {
    inputs: PricingInputs;
    breakdown: PricingBreakdown;
    paramsSnapshot: PricingParams;
    mode: "create" | "update";
  }): boolean => {
    if (mode === "update" && editingRecordId) {
      let updated = false;
      const nextRecords = records.map((record) => {
        if (record.id !== editingRecordId) return record;
        updated = true;
        const nextSelectedMaterialId = selectedMaterialId || "";
        const materialSnapshot = getSelectedMaterialSnapshot();
        return {
          ...record,
          name: toyName || record.name,
          productName: toyName || record.productName || record.name,
          category,
          inputs,
          params: paramsSnapshot,
          breakdown,
          total: breakdown.finalPrice,
          selectedMaterialId: nextSelectedMaterialId,
          materialGramsUsed: nextSelectedMaterialId ? inputs.materialGrams * 1 : 0,
          materialType: nextSelectedMaterialId ? materialSnapshot.materialType : null,
          materialColorName: nextSelectedMaterialId ? materialSnapshot.materialColorName : null,
          materialBrand: nextSelectedMaterialId ? materialSnapshot.materialBrand : null,
        };
      });
      if (updated) {
        persistHistory(nextRecords);
        return true;
      }
    }

    const newRecord = buildRecord({ inputs, breakdown, paramsSnapshot });
    const signature = buildRecordSignature(inputs, paramsSnapshot);
    const saved = persistHistory([newRecord, ...records], { signature });
    setEditingRecordId(null);
    return saved;
  };

  const calculatePrice = () => {
    if (isCalculatingRef.current) return;
    const inputs = getInputs();
    if (!inputs) return;

    if (!isValidInputs(inputs) || !isValidParams(params)) {
      return;
    }

    isCalculatingRef.current = true;
    setIsCalculating(true);

    setTimeout(() => {
      const breakdown = pricingCalculator({ inputs, params });
      if (!isValidBreakdown(breakdown)) {
        setIsCalculating(false);
        isCalculatingRef.current = false;
        return;
      }
      setResult({ timeMinutes: inputs.timeMinutes, materialGrams: inputs.materialGrams, breakdown });
      saveCalculation({
        inputs,
        breakdown,
        paramsSnapshot: params,
        mode: editingRecordId ? "update" : "create",
      });
      setIsCalculating(false);
      isCalculatingRef.current = false;
    }, 1200);
  };

  useEffect(() => {
    if (!result) return;
    const inputs = getInputs();
    if (!inputs) return;
    if (!isValidInputs(inputs) || !isValidParams(params)) return;
    const breakdown = pricingCalculator({ inputs, params });
    if (!isValidBreakdown(breakdown)) return;
    setResult({ timeMinutes: inputs.timeMinutes, materialGrams: inputs.materialGrams, breakdown });
  }, [params]);

  const saveResult = () => {
    const inputs = getInputs();
    if (!inputs) return false;
    if (!isValidInputs(inputs) || !isValidParams(params)) return false;

    const breakdown = pricingCalculator({ inputs, params });
    if (!isValidBreakdown(breakdown)) return false;
    setResult({ timeMinutes: inputs.timeMinutes, materialGrams: inputs.materialGrams, breakdown });
    const saved = saveCalculation({
      inputs,
      breakdown,
      paramsSnapshot: params,
      mode: editingRecordId ? "update" : "create",
    });
    if (saved && !editingRecordId) {
      clearFields();
    }
    return saved;
  };

  const clearFields = () => {
    setToyName("");
    setPrintHours("");
    setPrintMinutes("");
    setAssemblyHours("");
    setAssemblyMinutes("");
    setMaterialWeight("");
    setSelectedMaterialId("");
    setStockError("");
    setResult(null);
    setEditingRecordId(null);
  };

  const deleteHistory = () => {
    if (confirm("¿Estás seguro de borrar todo el historial?")) {
      persistHistory([]);
      setEditingRecordId(null);
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Fecha",
      "Nombre",
      "Categoría",
      "Estado",
      "Tiempo (min)",
      "Material (g)",
      "Costo Total",
      "Precio Venta",
      "Ganancia",
      "Material",
      "Color",
      "Marca",
      "Gramos usados",
      "Gramos perdidos",
      "Costo material perdido",
      "Costo energía perdido",
      "Nota fallo",
    ];
    const rows = monthlyReportRecords.map((r) => {
      const snapshot = resolveMaterialSnapshotFromRecord(r);
      const isFailed = r.status === "fallido";
      const priceValue = isFailed ? 0 : r.breakdown.finalPrice;
      const profitValue = isFailed ? 0 : r.breakdown.profit;
      return [
        r.date,
        r.name,
        r.category,
        r.status,
        r.inputs.timeMinutes.toFixed(0),
        r.inputs.materialGrams.toFixed(0),
        r.breakdown.totalCost.toFixed(0),
        priceValue.toFixed(0),
        profitValue.toFixed(0),
        snapshot?.materialType ?? "",
        snapshot?.colorName ?? "",
        snapshot?.brandName ?? "",
        snapshot?.grams ? snapshot.grams.toFixed(0) : "",
        r.failure?.gramsLost ? r.failure.gramsLost.toFixed(0) : "",
        r.failure?.materialCostLost ? r.failure.materialCostLost.toFixed(0) : "",
        r.failure?.energyCostLost ? r.failure.energyCostLost.toFixed(0) : "",
        r.failure?.note ?? "",
      ];
    });

    const consumptionHeaders = ["Material", "Color", "Marca", "Gramos usados"];
    const consumptionRows = materialConsumptionRows.map((row) => [
      row.material,
      row.color,
      row.brand,
      row.grams.toFixed(0),
    ]);

    const escapeXml = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&apos;");

    const buildWorksheet = (name: string, sheetRows: string[][]) => {
      const rowsXml = sheetRows
        .map((row) => {
          const cells = row
            .map((cell) => {
              const isNumber = cell !== "" && Number.isFinite(Number(cell));
              const type = isNumber ? "Number" : "String";
              return `<Cell><Data ss:Type="${type}">${escapeXml(cell)}</Data></Cell>`;
            })
            .join("");
          return `<Row>${cells}</Row>`;
        })
        .join("");
      return `<Worksheet ss:Name="${escapeXml(name)}"><Table>${rowsXml}</Table></Worksheet>`;
    };

    const workbook = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  ${buildWorksheet("Historial", [headers, ...rows])}
  ${buildWorksheet("Consumo material", [consumptionHeaders, ...consumptionRows])}
</Workbook>`;

    const blob = new Blob([workbook], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-mensual-${reportYear}-${String(reportMonth + 1).padStart(2, "0")}.xls`;
    a.click();
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours} Hs ${mins} min`;
  };

  const totalPrintMinutes = () => {
    const hours = parseFloat(printHours) || 0;
    const minutes = parseFloat(printMinutes) || 0;
    return hours * 60 + minutes;
  };

  const totalAssemblyMinutes = () => {
    const hours = parseFloat(assemblyHours) || 0;
    const minutes = parseFloat(assemblyMinutes) || 0;
    return hours * 60 + minutes;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const parseRecordDate = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return null;
    const parts = normalized.split(/[\/\-]/);
    if (parts.length === 3) {
      const [dayPart, monthPart, yearPart] = parts;
      const day = Number.parseInt(dayPart, 10);
      const month = Number.parseInt(monthPart, 10);
      const year = Number.parseInt(yearPart, 10);
      if (Number.isFinite(day) && Number.isFinite(month) && Number.isFinite(year)) {
        return new Date(year, Math.max(0, month - 1), day);
      }
    }
    const fallback = new Date(normalized);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  };

  const handleParamChange = <K extends keyof PricingParams>(key: K, value: string) => {
    const numericValue = parseFloat(value);
    setParams((prev) => ({
      ...prev,
      [key]: Number.isNaN(numericValue) ? 0 : numericValue,
    }));
  };

  const openConfirmModal = (record: HistoryRecord) => {
    setConfirmTarget(record);
    setIsConfirmModalOpen(true);
  };

  const closeConfirmModal = () => {
    setIsConfirmModalOpen(false);
    setConfirmTarget(null);
  };

  const getRequiredGramsForRecord = (record: HistoryRecord) => {
    const quantity = typeof record.quantity === "number" && record.quantity > 0 ? record.quantity : 1;
    if (typeof record.materialGramsUsed === "number" && Number.isFinite(record.materialGramsUsed)) {
      return record.materialGramsUsed;
    }
    return record.inputs.materialGrams * quantity;
  };

  const openFailureModal = (record: HistoryRecord) => {
    setFailureTarget(record);
    setFailurePercent(50);
    setFailureNote("");
    setIsFailureModalOpen(true);
  };

  const closeFailureModal = (options?: { reset?: boolean }) => {
    setIsFailureModalOpen(false);
    if (options?.reset === false) return;
    setFailureTarget(null);
    setFailureNote("");
  };

  const handleConfirmProduction = () => {
    if (!confirmTarget) return;
    if (confirmTarget.status !== "cotizado") {
      closeConfirmModal();
      return;
    }
    const nextRecords = records.map((record) =>
      record.id === confirmTarget.id
        ? { ...record, status: "confirmado" as const, stockDeductedGrams: 0 }
        : record,
    );
    persistHistory(nextRecords);
    closeConfirmModal();
  };

  const applyMaterialSelection = (recordId: string, materialId: string) => {
    const spool = materialStock.find((item) => item.id === materialId);
    if (!spool) return;
    const nextRecords = records.map((record) => {
      if (record.id !== recordId) return record;
      return {
        ...record,
        selectedMaterialId: spool.id,
        materialType: spool.materialType ?? null,
        materialColorName: spool.color?.name ?? null,
        materialBrand: spool.brand ?? null,
        materialGramsUsed: getRequiredGramsForRecord(record),
      };
    });
    persistHistory(nextRecords);
  };

  const handleStartProduction = (record: HistoryRecord) => {
    if (record.status !== "confirmado") return;
    const nextRecords = records.map((item) =>
      item.id === record.id
        ? { ...item, status: "en_produccion" as const, startedAt: new Date().toISOString() }
        : item,
    );
    persistHistory(nextRecords);
  };

  const handleMarkFinalized = (record: HistoryRecord) => {
    if (record.status !== "en_produccion") return;
    const required = getRequiredGramsForRecord(record);
    const spool = record.selectedMaterialId
      ? materialStock.find((item) => item.id === record.selectedMaterialId)
      : undefined;
    const isDemoSpool = Boolean(spool?.isDemo);
    if (!isDemoSpool) {
      const available = spool?.gramsAvailable ?? 0;
      if (!spool || required > available) {
        setStockModal({
          open: true,
          available,
          required,
          recordId: record.id,
          selectedMaterialId: record.selectedMaterialId ?? "",
          resumeFailure: false,
        });
        return;
      }
      const nextStock = materialStock.map((item) =>
        item.id === spool.id ? { ...item, gramsAvailable: item.gramsAvailable - required } : item,
      );
      persistMaterialStock(nextStock);
    }
    const nextRecords = records.map((item) =>
      item.id === record.id
        ? { ...item, status: "finalizado" as const, stockDeductedGrams: isDemoSpool ? 0 : required }
        : item,
    );
    persistHistory(nextRecords);
  };

  const handleConfirmFailure = () => {
    if (!failureTarget) return;
    if (failureTarget.status !== "en_produccion") {
      closeFailureModal();
      return;
    }
    const required = getRequiredGramsForRecord(failureTarget);
    const percent = Math.min(99, Math.max(0, failurePercent));
    const gramsLost = (required * percent) / 100;
    const gramsRecovered = Math.max(0, required - gramsLost);
    const spool = failureTarget.selectedMaterialId
      ? materialStock.find((item) => item.id === failureTarget.selectedMaterialId)
      : undefined;
    const isDemoSpool = Boolean(spool?.isDemo);
    if (!isDemoSpool && spool) {
      const available = spool.gramsAvailable ?? 0;
      const nextStock = materialStock.map((item) =>
        item.id === spool.id ? { ...item, gramsAvailable: Math.max(0, available - gramsLost) } : item,
      );
      persistMaterialStock(nextStock);
    }
    const failureDetails: FailureDetails = {
      date: new Date().toLocaleDateString("es-AR"),
      percentPrinted: percent,
      gramsLost,
      gramsRecovered,
      materialCostLost: (failureTarget.breakdown.materialCost * percent) / 100,
      energyCostLost: (failureTarget.breakdown.energyCost * percent) / 100,
      note: failureNote.trim() || undefined,
    };
    const nextRecords = records.map((item) =>
      item.id === failureTarget.id
        ? {
            ...item,
            status: "fallido" as const,
            failure: failureDetails,
            stockDeductedGrams: isDemoSpool ? 0 : gramsLost,
          }
        : item,
    );
    persistHistory(nextRecords);
    closeFailureModal();
  };

  const openRecord = (record: HistoryRecord) => {
    if (record.status !== "cotizado") {
      toast.info("Esta cotización ya fue procesada y no se puede editar.", {
        duration: 2500,
      });
      return;
    }
    setToyName(record.name);
    setCategory(record.category.trim() || "General");
    setPrintHours(toFixedString(Math.floor(record.inputs.timeMinutes / 60)));
    setPrintMinutes(toFixedString(Math.round(record.inputs.timeMinutes % 60)));
    setAssemblyHours(toFixedString(Math.floor(record.inputs.assemblyMinutes / 60)));
    setAssemblyMinutes(toFixedString(Math.round(record.inputs.assemblyMinutes % 60)));
    setMaterialWeight(toFixedString(record.inputs.materialGrams));
    setSelectedMaterialId(record.selectedMaterialId ?? "");
    setStockError("");
    setParams(record.params);
    setResult({
      timeMinutes: record.inputs.timeMinutes,
      materialGrams: record.inputs.materialGrams,
      breakdown: record.breakdown,
    });
    setEditingRecordId(record.id);
    setActiveSection("calculator");
  };

  const duplicateRecord = (record: HistoryRecord) => {
    const materialGramsUsed =
      typeof record.materialGramsUsed === "number" && Number.isFinite(record.materialGramsUsed)
        ? record.materialGramsUsed
        : (record.inputs?.materialGrams ?? 0) * (record.quantity || 1);
    const duplicated: HistoryRecord = {
      ...record,
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("es-AR"),
      status: "cotizado",
      stockDeductedGrams: 0,
      startedAt: null,
      failure: null,
      stockChanges: [],
      materialGramsUsed,
    };
    persistHistory([duplicated, ...records], { allowDuplicateSignature: true });
  };

  const deleteRecord = (record: HistoryRecord) => {
    if (record.status !== "cotizado") {
      toast.info("Solo podés eliminar cotizaciones en estado cotizado.", { duration: 2500 });
      return;
    }
    if (!confirm("¿Eliminar este producto del historial?")) return;
    const nextRecords = records.filter((item) => item.id !== record.id);
    persistHistory(nextRecords);
    if (editingRecordId === record.id) {
      clearFields();
    }
  };

  const totalToys = records.length;
  const revenueRecords = records.filter((record) => record.status === "finalizado");
  const failedRecords = records.filter((record) => record.status === "fallido");
  const totalHours = revenueRecords.reduce((sum, r) => sum + r.inputs.timeMinutes, 0) / 60;
  const totalProfit = revenueRecords.reduce((sum, r) => sum + r.breakdown.profit, 0);
  const mostProfitable =
    revenueRecords.length > 0
      ? revenueRecords.reduce((max, r) => (r.breakdown.profit > max.breakdown.profit ? r : max), revenueRecords[0])
      : null;

  const categoryData = revenueRecords.reduce((acc: { category: string; profit: number }[], record) => {
    const existing = acc.find((item) => item.category === record.category);
    if (existing) {
      existing.profit += record.breakdown.profit;
    } else {
      acc.push({ category: record.category, profit: record.breakdown.profit });
    }
    return acc;
  }, []);

  const reportMonthLabel = MONTH_NAMES[reportMonth] ?? "";
  const monthlyRecords = revenueRecords.filter((record) => {
    const parsed = parseRecordDate(record.date);
    if (!parsed) return false;
    return parsed.getMonth() === reportMonth && parsed.getFullYear() === reportYear;
  });
  const monthlyFailedRecords = failedRecords.filter((record) => {
    const parsed = parseRecordDate(record.date);
    if (!parsed) return false;
    return parsed.getMonth() === reportMonth && parsed.getFullYear() === reportYear;
  });
  const monthlyFailureLosses = monthlyFailedRecords.reduce(
    (sum, record) => sum + (record.failure?.materialCostLost ?? 0) + (record.failure?.energyCostLost ?? 0),
    0,
  );
  const monthlyFailureGrams = monthlyFailedRecords.reduce(
    (sum, record) => sum + (record.failure?.gramsLost ?? 0),
    0,
  );
  const monthlyAttempted = monthlyRecords.length + monthlyFailedRecords.length;
  const monthlyFailureRate = monthlyAttempted > 0 ? (monthlyFailedRecords.length / monthlyAttempted) * 100 : 0;
  const monthlyReportRecords = [...monthlyRecords, ...monthlyFailedRecords].sort((a, b) => {
    const dateA = parseRecordDate(a.date)?.getTime() ?? 0;
    const dateB = parseRecordDate(b.date)?.getTime() ?? 0;
    return dateB - dateA;
  });
  const monthlyTotal = monthlyRecords.reduce((sum, record) => sum + (record.total || record.breakdown.finalPrice), 0);
  const monthlyAverage = monthlyRecords.length > 0 ? monthlyTotal / monthlyRecords.length : 0;
  const monthlyProductTotals = monthlyRecords.reduce<Record<string, number>>((acc, record) => {
    const name = record.productName || record.name || "Producto";
    acc[name] = (acc[name] ?? 0) + (record.total || record.breakdown.finalPrice);
    return acc;
  }, {});
  const materialConsumptionByMaterial = new Map<string, number>();
  const materialConsumptionByColor = new Map<string, number>();
  const materialConsumptionByBrand = new Map<string, number>();
  const materialConsumptionByCombo = new Map<string, { material: string; color: string; brand: string; grams: number }>();
  let totalMaterialGrams = 0;

  monthlyRecords.forEach((record) => {
    const snapshot = resolveMaterialSnapshotFromRecord(record);
    if (!snapshot || snapshot.grams <= 0) return;
    const materialKey = snapshot.materialType || "Sin material";
    const colorKey = snapshot.colorName || "Sin color";
    const brandKey = snapshot.brandName || "Sin marca";
    totalMaterialGrams += snapshot.grams;
    materialConsumptionByMaterial.set(
      materialKey,
      (materialConsumptionByMaterial.get(materialKey) ?? 0) + snapshot.grams,
    );
    materialConsumptionByColor.set(
      colorKey,
      (materialConsumptionByColor.get(colorKey) ?? 0) + snapshot.grams,
    );
    materialConsumptionByBrand.set(
      brandKey,
      (materialConsumptionByBrand.get(brandKey) ?? 0) + snapshot.grams,
    );
    const comboKey = `${materialKey}||${colorKey}||${brandKey}`;
    const combo = materialConsumptionByCombo.get(comboKey);
    if (combo) {
      combo.grams += snapshot.grams;
    } else {
      materialConsumptionByCombo.set(comboKey, {
        material: materialKey,
        color: colorKey,
        brand: brandKey,
        grams: snapshot.grams,
      });
    }
  });

  const materialConsumptionByMaterialList = Array.from(materialConsumptionByMaterial.entries())
    .map(([material, grams]) => ({ material, grams }))
    .sort((a, b) => b.grams - a.grams);
  const materialConsumptionByColorList = Array.from(materialConsumptionByColor.entries())
    .map(([color, grams]) => ({ color, grams }))
    .sort((a, b) => b.grams - a.grams);
  const materialConsumptionByBrandList = Array.from(materialConsumptionByBrand.entries())
    .map(([brand, grams]) => ({ brand, grams }))
    .sort((a, b) => b.grams - a.grams);
  const materialConsumptionRows = Array.from(materialConsumptionByCombo.values()).sort((a, b) => b.grams - a.grams);
  const productionRecords = records.filter(
    (record) =>
      record.status === "confirmado" || record.status === "en_produccion" || record.status === "fallido",
  );
  const tableRecords =
    activeSection === "production"
      ? productionRecords
      : activeSection === "reports"
        ? monthlyReportRecords
        : records;
  const historyTitle =
    activeSection === "production"
      ? "Producción"
      : activeSection === "reports"
        ? "Reporte mensual"
        : "Cotizaciones";
  const HistoryIcon = activeSection === "production" ? Factory : History;
  const isReportView = activeSection === "reports";
  const topProducts = Object.entries(monthlyProductTotals)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  const availableYears = Array.from(
    new Set(
      records
        .map((record) => parseRecordDate(record.date)?.getFullYear())
        .filter((year): year is number => typeof year === "number"),
    ),
  )
    .concat(reportYear)
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort((a, b) => b - a);

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-20 left-10 text-blue-200 opacity-30"
        >
          <Box size={80} />
        </motion.div>
        <motion.div
          animate={{ y: [0, 20, 0], rotate: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute top-40 right-20 text-green-200 opacity-30"
        >
          <Rocket size={60} />
        </motion.div>
        <motion.div
          animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute bottom-20 left-1/4 text-yellow-200 opacity-30"
        >
          <Package size={70} />
        </motion.div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
            <Printer className="text-blue-500" size={48} />
            Calculadora de Costos 3D
          </h1>
          <p className="text-gray-600 text-lg">Calcula precios y gestiona tu negocio de impresión 3D</p>
        </motion.div>

        <div className="flex gap-6">
          <aside className="w-56 shrink-0">
            <div className="bg-white rounded-2xl shadow-lg p-3 space-y-2">
              {(
                [
                  { id: "stock", label: "Stock", icon: Package },
                  { id: "calculator", label: "Calculadora", icon: Calculator },
                  { id: "quotations", label: "Cotizaciones", icon: FileText },
                  { id: "production", label: "Producción", icon: Factory },
                  { id: "reports", label: "Reportes", icon: BarChart3 },
                  { id: "profitability", label: "Rentabilidad", icon: TrendingUp },
                  { id: "branding", label: "Branding", icon: Palette },
                  { id: "settings", label: "Configuración", icon: Settings },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                      isActive ? "bg-blue-500 text-white shadow-md" : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </aside>
          <main className="flex-1">
            {showStockBanner && (
              <div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl" aria-hidden="true">
                      ⚠️
                    </span>
                    <div>
                      <p className="font-semibold">
                        Antes de cotizar o producir, cargá tu stock de filamento para obtener costos reales y evitar
                        errores de material.
                      </p>
                      <p className="mt-2 text-xs text-yellow-800">
                        Este modo es solo orientativo. Para resultados reales, cargá tu stock verdadero.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveSection("stock")}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all font-semibold"
                    >
                      Cargar stock ahora
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateDemoStock}
                      className="bg-white text-yellow-900 px-4 py-2 rounded-lg border border-yellow-300 hover:bg-yellow-100 transition-all font-semibold"
                    >
                      Usar stock estimado (modo demo)
                    </button>
                  </div>
                </div>
              </div>
            )}
            <AnimatePresence mode="wait">
              {activeSection === "calculator" ? (
            <motion.div
              key="calculator"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-white rounded-3xl shadow-2xl p-8 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Sparkles className="text-yellow-500" />
                  Información del Producto
                </h2>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del producto</label>
                    <input
                      type="text"
                      value={toyName}
                      onChange={(e) => setToyName(e.target.value)}
                      placeholder="ej. Soporte X1"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría</label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="General"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tiempo de impresión</label>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        value={printHours}
                        onChange={(e) => setPrintHours(e.target.value)}
                        placeholder="Horas"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                        min="0"
                      />
                      <input
                        type="number"
                        value={printMinutes}
                        onChange={(e) => setPrintMinutes(e.target.value)}
                        placeholder="Minutos"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                        min="0"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Ingresa horas y minutos para un cálculo más preciso.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tiempo de armado</label>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        value={assemblyHours}
                        onChange={(e) => setAssemblyHours(e.target.value)}
                        placeholder="Horas"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                        min="0"
                      />
                      <input
                        type="number"
                        value={assemblyMinutes}
                        onChange={(e) => setAssemblyMinutes(e.target.value)}
                        placeholder="Minutos"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                        min="0"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Si no hay armado, deja en 0.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Peso del material (gramos)</label>
                    <input
                      type="number"
                      value={materialWeight}
                      onChange={(e) => {
                        setMaterialWeight(e.target.value);
                        setStockError("");
                      }}
                      placeholder="ej. 142"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Filamento a usar</label>
                    <select
                      value={selectedMaterialId}
                      onChange={(event) => {
                        setSelectedMaterialId(event.target.value);
                        setStockError("");
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-white"
                    >
                      <option value="">Sin seleccionar (opcional)</option>
                      {materialStock.length === 0 && <option value="">No hay spools cargados</option>}
                      {materialStock.map((spool) => (
                        <option key={spool.id} value={spool.id}>
                          {spool.displayName}
                          {spool.isDemo ? " · Demo" : ""} · {spool.gramsAvailable}g
                        </option>
                      ))}
                    </select>
                    {stockError && <p className="text-xs text-red-500 mt-2">{stockError}</p>}
                  </div>
                </div>

                <div className="mt-10 border-t border-gray-100 pt-8">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-900">Parámetros base (editables)</h3>
                    <p className="text-sm text-gray-500">
                      ?? Solo cambia estos valores si varían los costos base. Los productos se cargan en la hoja 'Costos'.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Filamento $/kg</label>
                      <input
                        type="number"
                        value={params.filamentCostPerKg}
                        onChange={(e) => handleParamChange("filamentCostPerKg", e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Potencia (W)</label>
                      <input
                        type="number"
                        value={params.powerWatts}
                        onChange={(e) => handleParamChange("powerWatts", e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Costo kWh ($)</label>
                      <input
                        type="number"
                        value={params.energyCostPerKwh}
                        onChange={(e) => handleParamChange("energyCostPerKwh", e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Armado $/hora</label>
                      <input
                        type="number"
                        value={params.laborPerHour}
                        onChange={(e) => handleParamChange("laborPerHour", e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Desgaste (%)</label>
                      <input
                        type="number"
                        value={params.wearPercent}
                        onChange={(e) => handleParamChange("wearPercent", e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Operativo (%)</label>
                      <input
                        type="number"
                        value={params.operationalPercent}
                        onChange={(e) => handleParamChange("operationalPercent", e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Utilidad (%)</label>
                      <input
                        type="number"
                        value={params.profitPercent}
                        onChange={(e) => handleParamChange("profitPercent", e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={calculatePrice}
                  disabled={totalPrintMinutes() <= 0 || !materialWeight || isCalculating}
                  className="mt-8 w-full bg-gradient-to-r from-blue-500 to-green-500 text-white font-bold py-4 rounded-xl hover:from-blue-600 hover:to-green-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 text-lg shadow-lg"
                >
                  <Calculator size={24} />
                  {isCalculating ? "Calculando..." : "Calcular Precio"}
                </button>
              </div>
              <AnimatePresence>
                {isCalculating && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white rounded-3xl shadow-2xl p-8 mb-6"
                  >
                    <div className="flex flex-col items-center justify-center py-8">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                        <Printer size={64} className="text-blue-500" />
                      </motion.div>
                      <p className="text-gray-600 mt-4 text-lg font-medium">Imprimiendo cálculos...</p>
                      <div className="w-64 h-2 bg-gray-200 rounded-full mt-4 overflow-hidden">
                        <motion.div
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 1.2 }}
                          className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {result && !isCalculating && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-gradient-to-br from-blue-500 to-green-500 rounded-3xl shadow-2xl p-8 text-white"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                        <Sparkles size={32} />
                      </motion.div>
                      <h2 className="text-3xl font-bold">{toyName || "Producto"}</h2>
                    </div>

                    <AnimatePresence>
                      {saveBanner && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={`mb-6 rounded-2xl border px-4 py-3 ${
                            saveBanner.type === "success"
                              ? "border-green-200 bg-white/90 text-green-700"
                              : "border-red-200 bg-white/90 text-red-600"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <span className="text-lg" aria-hidden="true">
                                {saveBanner.type === "success" ? "✅" : "⚠️"}
                              </span>
                              <div>
                                <p className="text-sm font-semibold">{saveBanner.message}</p>
                                {saveBanner.description && (
                                  <p className="text-xs opacity-80">{saveBanner.description}</p>
                                )}
                              </div>
                            </div>
                            {saveBanner.type === "success" && (
                              <button
                                type="button"
                                onClick={() => setActiveSection("quotations")}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                              >
                                Ver en Cotizaciones
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      <div className="bg-white/20 backdrop-blur rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock size={20} />
                          <span className="text-sm font-medium">Tiempo estimado</span>
                        </div>
                        <p className="text-2xl font-bold">{formatTime(result.timeMinutes)}</p>
                      </div>

                      <div className="bg-white/20 backdrop-blur rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Package size={20} />
                          <span className="text-sm font-medium">Material usado</span>
                        </div>
                        <p className="text-2xl font-bold">{result.materialGrams.toFixed(0)} g PLA</p>
                      </div>

                      <div className="bg-white/20 backdrop-blur rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign size={20} />
                          <span className="text-sm font-medium">Costo total</span>
                        </div>
                        <p className="text-2xl font-bold">{formatCurrency(result.breakdown.subtotal)}</p>
                      </div>

                      <div className="bg-white/20 backdrop-blur rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp size={20} />
                          <span className="text-sm font-medium">Ganancia esperada ({params.profitPercent}%)</span>
                        </div>
                        <p className="text-2xl font-bold">{formatCurrency(result.breakdown.profit)}</p>
                      </div>
                    </div>

                    <div className="bg-white text-gray-800 rounded-xl p-6 mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <DollarSign size={18} className="text-blue-500" />
                          <h3 className="text-lg font-semibold">Desglose</h3>
                        </div>
                        <span className="text-xs text-gray-500">Actualizado con los parámetros base</span>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Costo material</span>
                          <span className="font-semibold">{formatCurrency(result.breakdown.materialCost)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Costo energía</span>
                          <span className="font-semibold">{formatCurrency(result.breakdown.energyCost)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Costo armado</span>
                          <span className="font-semibold">{formatCurrency(result.breakdown.laborCost)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Desgaste</span>
                          <span className="font-semibold">{formatCurrency(result.breakdown.wearCost)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Operativo</span>
                          <span className="font-semibold">{formatCurrency(result.breakdown.operatingCost)}</span>
                        </div>
                        <div className="flex items-center justify-between font-semibold text-gray-800">
                          <span>Subtotal</span>
                          <span>{formatCurrency(result.breakdown.subtotal)}</span>
                        </div>
                        <div className="flex items-center justify-between font-semibold text-gray-800">
                          <span>Utilidad ({params.profitPercent}%)</span>
                          <span>{formatCurrency(result.breakdown.profit)}</span>
                        </div>
                        <div className="flex items-center justify-between font-bold text-green-600 text-lg border-t border-gray-200 pt-3 md:col-span-2">
                          <span>Total final</span>
                          <span>{formatCurrency(result.breakdown.finalPrice)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white text-gray-800 rounded-xl p-6 mb-6">
                      <div className="text-center">
                        <p className="text-sm font-medium mb-2">Precio sugerido de venta</p>
                        <p className="text-5xl font-bold text-green-600">{formatCurrency(result.breakdown.finalPrice)}</p>
                        <div className="mt-4 flex items-center justify-center">
                          <div
                            className="relative inline-flex"
                            title={!IS_PRO_SANDBOX && isFreeLimitReached ? "Disponible en Costly3D PRO" : undefined}
                          >
                            {!IS_PRO_SANDBOX && isFreeLimitReached && (
                              <button
                                type="button"
                                className="absolute inset-0 cursor-not-allowed"
                                onClick={exportQuotationPdf}
                                aria-label="Disponible en Costly3D PRO"
                              />
                            )}
                            <button
                              type="button"
                              disabled={!IS_PRO_SANDBOX && isFreeLimitReached}
                              onClick={exportQuotationPdf}
                              className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-white px-4 py-2 text-sm font-semibold text-green-700 shadow-sm transition hover:bg-green-50 disabled:opacity-60 disabled:cursor-not-allowed"
                              title={!IS_PRO_SANDBOX && isFreeLimitReached ? "Disponible en Costly3D PRO" : undefined}
                            >
                              Exportar cotización (PDF)
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                                PRO
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={() => {
                          if (!result || isSaving) return;
                          setIsSaving(true);
                          try {
                            const saved = saveResult();
                            if (saved) {
                              showSaveBanner({
                                type: "success",
                                message: "Cotización guardada correctamente.",
                                description: "Podés verla en Cotizaciones.",
                              });
                            }
                          } catch (error) {
                            showSaveBanner({
                              type: "error",
                              message: "No pudimos guardar la cotización.",
                              description: "Intentá de nuevo en unos segundos.",
                            });
                          } finally {
                            window.setTimeout(() => setIsSaving(false), 300);
                          }
                        }}
                        disabled={!result || isSaving}
                        className="flex-1 bg-white text-blue-600 font-bold py-3 rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving ? (
                          <>
                            <span className="h-4 w-4 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
                            Guardando…
                          </>
                        ) : (
                          <>
                            <Save size={20} />
                            Guardar resultado
                          </>
                        )}
                      </button>
                      <button
                        onClick={clearFields}
                        className="flex-1 bg-white/20 backdrop-blur text-white font-bold py-3 rounded-xl hover:bg-white/30 transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 size={20} />
                        Limpiar campos
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-7xl mx-auto"
            >
              {activeSection === "reports" && (
                <div className="grid md:grid-cols-4 gap-4 mb-6">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white"
                  >
                  <div className="flex items-center justify-between mb-2">
                    <Box size={32} />
                    <span className="text-3xl font-bold">{totalToys}</span>
                  </div>
                  <p className="text-sm font-medium opacity-90">Productos registrados</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Clock size={32} />
                    <span className="text-3xl font-bold">{totalHours.toFixed(0)}</span>
                  </div>
                  <p className="text-sm font-medium opacity-90">Horas de impresión</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl shadow-lg p-6 text-white"
                >
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp size={32} />
                    <span className="text-2xl font-bold">{formatCurrency(totalProfit)}</span>
                  </div>
                  <p className="text-sm font-medium opacity-90">Ganancia total</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Sparkles size={32} />
                    <span className="text-sm font-bold">{mostProfitable?.name || "N/A"}</span>
                  </div>
                  <p className="text-sm font-medium opacity-90">Más rentable</p>
                </motion.div>
              </div>
              )}

              {activeSection === "reports" && (
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-red-50 rounded-2xl border border-red-100 p-4 text-sm text-red-700">
                    <p className="text-xs uppercase tracking-wide text-red-500">Pérdidas por fallas</p>
                    <p className="mt-2 text-lg font-semibold">{formatCurrency(monthlyFailureLosses)}</p>
                  </div>
                  <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4 text-sm text-amber-700">
                    <p className="text-xs uppercase tracking-wide text-amber-600">Gramos desperdiciados</p>
                    <p className="mt-2 text-lg font-semibold">{monthlyFailureGrams.toFixed(0)} g</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Tasa de fallas</p>
                    <p className="mt-2 text-lg font-semibold">{monthlyFailureRate.toFixed(1)}%</p>
                  </div>
                </div>
              )}

              {activeSection === "reports" && categoryData.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl shadow-2xl p-8 mb-6"
                >
                  <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <BarChart3 size={28} className="text-blue-500" />
                    Ganancia por Categoría
                  </h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="category" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
                      />
                      <Bar dataKey="profit" radius={[8, 8, 0, 0]}>
                        {categoryData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {(activeSection === "quotations" ||
                activeSection === "production" ||
                activeSection === "reports") && (
                <div className="bg-white rounded-3xl shadow-2xl p-8">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <HistoryIcon size={28} className="text-blue-500" />
                    {historyTitle}
                  </h2>
                  {activeSection === "reports" && (
                    <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={reportMonth}
                        onChange={(event) => setReportMonth(Number(event.target.value))}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
                      >
                        {MONTH_NAMES.map((name, index) => (
                          <option key={name} value={index}>
                            {name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={reportYear}
                        onChange={(event) => setReportYear(Number(event.target.value))}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
                      >
                        {availableYears.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={exportMonthlyReportPdf}
                        disabled={monthlyRecords.length === 0}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                      >
                        <Download size={18} />
                        Reporte mensual
                      </button>
                    </div>
                    <button
                      onClick={exportToCSV}
                      disabled={monthlyRecords.length === 0}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      <Download size={18} />
                      Exportar Excel
                    </button>
                    <button
                      onClick={deleteHistory}
                      disabled={records.length === 0}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      <Trash2 size={18} />
                      Borrar historial
                    </button>
                  </div>
                  )}
                </div>

                {tableRecords.length === 0 ? (
                  <div className="text-center py-16">
                    <Box size={64} className="text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">No hay registros todavía</p>
                    <p className="text-gray-400">Calcula tu primer producto para comenzar</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Fecha</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Nombre</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Categoría</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">Tiempo</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">Costo Total</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">Precio Venta</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">Ganancia</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Estado</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableRecords.map((record, index) => (
                          <motion.tr
                            key={record.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={(event) => {
                              if (activeSection !== "quotations") return;
                              // Historial shortcut: Alt + click = duplicar cálculo.
                              if (event.altKey) {
                                if (record.status === "cotizado") {
                                  duplicateRecord(record);
                                }
                                return;
                              }
                              // Historial shortcut: click = abrir para ver/editar.
                              openRecord(record);
                            }}
                          >
                            <td className="py-4 px-4 text-gray-600">{record.date}</td>
                            <td className="py-4 px-4 font-semibold text-gray-800">
                              <div>{record.name}</div>
                              <p className="mt-1 text-xs font-normal text-gray-500">
                                {getMaterialDisplayFromRecord(record)}
                              </p>
                            </td>
                            <td className="py-4 px-4">
                              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                                {record.category}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right text-gray-600">{formatTime(record.inputs.timeMinutes)}</td>
                            <td className="py-4 px-4 text-right text-gray-800 font-medium">
                              {formatCurrency(record.breakdown.totalCost)}
                            </td>
                            <td className="py-4 px-4 text-right text-green-600 font-bold">
                              {formatCurrency(record.status === "fallido" ? 0 : record.breakdown.finalPrice)}
                            </td>
                            <td className="py-4 px-4 text-right text-green-600 font-semibold">
                              {formatCurrency(record.status === "fallido" ? 0 : record.breakdown.profit)}
                            </td>
                            <td className="py-4 px-4">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(record.status).className}`}
                              >
                                {getStatusBadge(record.status).label}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="relative inline-flex" title={!IS_PRO_SANDBOX ? "Disponible en Costly3D PRO" : undefined}>
                                  {!IS_PRO_SANDBOX && (
                                    <button
                                      type="button"
                                      className="absolute inset-0 cursor-not-allowed"
                                      onClick={(event) => event.stopPropagation()}
                                      aria-label="Disponible en Costly3D PRO"
                                    />
                                  )}
                                  <button
                                    type="button"
                                    disabled={!IS_PRO_SANDBOX}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      if (!IS_PRO_SANDBOX) return;
                                      exportRecordPdf(record);
                                    }}
                                    className="inline-flex items-center justify-center gap-1 rounded-full border border-purple-200 px-2 py-1 text-xs font-semibold text-purple-600 hover:bg-purple-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                    title={!IS_PRO_SANDBOX ? "Disponible en Costly3D PRO" : undefined}
                                  >
                                {IS_PRO_SANDBOX ? (
                                      <>
                                        <Download size={14} />
                                        PDF
                                      </>
                                    ) : (
                                      <>
                                        <Lock size={14} />
                                        PRO
                                      </>
                                    )}
                                  </button>
                                </div>
                                {!isReportView && record.status === "cotizado" && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        openRecord(record);
                                      }}
                                      className="inline-flex items-center justify-center rounded-full p-2 text-blue-500 hover:bg-blue-50 transition-colors"
                                      aria-label="Editar producto"
                                      title="Editar producto"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        openConfirmModal(record);
                                      }}
                                      className="inline-flex items-center justify-center rounded-full p-2 text-green-600 hover:bg-green-50 transition-colors"
                                      aria-label="Confirmar pedido"
                                      title="Confirmar pedido"
                                    >
                                      ✅
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        deleteRecord(record);
                                      }}
                                      className="inline-flex items-center justify-center rounded-full p-2 text-red-500 hover:bg-red-50 transition-colors"
                                      aria-label="Eliminar producto"
                                      title="Eliminar producto"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </>
                                )}
                                {!isReportView && activeSection === "production" && record.status === "confirmado" && (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleStartProduction(record);
                                    }}
                                    className="inline-flex items-center justify-center rounded-full p-2 text-blue-600 hover:bg-blue-50 transition-colors"
                                    aria-label="Iniciar impresión"
                                    title="Iniciar impresión"
                                  >
                                    🏭
                                  </button>
                                )}
                                {!isReportView && activeSection === "production" && record.status === "en_produccion" && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleMarkFinalized(record);
                                      }}
                                      className="inline-flex items-center justify-center rounded-full p-2 text-emerald-600 hover:bg-emerald-50 transition-colors"
                                      aria-label="Finalizar impresión"
                                      title="Finalizar impresión"
                                    >
                                      ✅
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        openFailureModal(record);
                                      }}
                                      className="inline-flex items-center justify-center rounded-full p-2 text-red-500 hover:bg-red-50 transition-colors"
                                      aria-label="Registrar impresión fallida"
                                      title="Registrar impresión fallida"
                                    >
                                      ❌
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {activeSection === "stock" && (
          <section className="max-w-5xl mx-auto mt-10">
            <div className="bg-white rounded-3xl shadow-2xl p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Stock de material</h2>
                  <p className="text-sm text-gray-600">Gestioná spools y controlá el gramaje disponible.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddSpoolClick}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all font-semibold"
                >
                  Agregar spool
                </button>
              </div>

            {stockNotice && <p className="text-sm text-red-500 mb-4">{stockNotice}</p>}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200 text-left">
                    <th className="py-3 px-4 font-semibold text-gray-700">Spool</th>
                    <th className="py-3 px-4 font-semibold text-gray-700">Material</th>
                    <th className="py-3 px-4 font-semibold text-gray-700">Color</th>
                    <th className="py-3 px-4 font-semibold text-gray-700">Marca</th>
                    <th className="py-3 px-4 font-semibold text-gray-700 text-right">Gramos</th>
                    <th className="py-3 px-4 font-semibold text-gray-700 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {materialStock.length === 0 ? (
                    <tr>
                      <td className="py-6 px-4 text-gray-500" colSpan={6}>
                        No hay spools cargados.
                      </td>
                    </tr>
                  ) : (
                    materialStock.map((spool) => (
                      <tr key={spool.id} className="border-b border-gray-100">
                        <td className="py-3 px-4 font-semibold text-gray-800">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{spool.displayName}</span>
                            {spool.isDemo && (
                              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-800">
                                Stock estimado (demo)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{spool.materialType || "—"}</td>
                        <td className="py-3 px-4 text-gray-600">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full border border-gray-200"
                              style={{ backgroundColor: spool.color?.hex ?? "#E2E8F0" }}
                            />
                            <span>{spool.color?.name || "—"}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{spool.brand || "—"}</td>
                        <td className="py-3 px-4 text-right text-gray-700">{spool.gramsAvailable} g</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleEditSpool(spool)}
                            className="text-blue-500 hover:text-blue-600 font-semibold text-sm"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 grid md:grid-cols-2 gap-6">
              <div
                ref={stockFormRef}
                className={`rounded-2xl border border-gray-200 p-5 transition-shadow ${
                  isStockFormHighlighted ? "ring-2 ring-blue-400 shadow-lg" : ""
                }`}
              >
                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                  {stockForm.id ? "Editar spool" : "Agregar spool"}
                </h3>
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2">Material</label>
                      <select
                        ref={materialSelectRef}
                        value={stockForm.materialOption}
                        onChange={(event) => setStockForm((prev) => ({ ...prev, materialOption: event.target.value }))}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white"
                      >
                        <option value="">Seleccionar material</option>
                        {MATERIAL_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      {stockForm.materialOption === "Otro..." && (
                        <input
                          type="text"
                          value={stockForm.materialOther}
                          onChange={(event) =>
                            setStockForm((prev) => ({ ...prev, materialOther: event.target.value }))
                          }
                          placeholder="Material (otro)"
                          className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2">Marca</label>
                      <select
                        value={stockForm.brandOption}
                        onChange={(event) => setStockForm((prev) => ({ ...prev, brandOption: event.target.value }))}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white"
                      >
                        <option value="">Seleccionar marca</option>
                        {BRAND_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      {stockForm.brandOption === "Otro..." && (
                        <input
                          type="text"
                          value={stockForm.brandOther}
                          onChange={(event) => setStockForm((prev) => ({ ...prev, brandOther: event.target.value }))}
                          placeholder="Marca (otro)"
                          className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Color</label>
                    <ColorPicker
                      value={stockForm.color}
                      options={COLOR_OPTIONS}
                      onChange={(color) => setStockForm((prev) => ({ ...prev, color }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Gramos disponibles</label>
                    <input
                      type="number"
                      value={stockForm.gramsAvailable}
                      onChange={(event) => setStockForm((prev) => ({ ...prev, gramsAvailable: event.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Costo por kg (opcional)</label>
                    <input
                      type="number"
                      value={stockForm.costPerKg}
                      onChange={(event) => setStockForm((prev) => ({ ...prev, costPerKg: event.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleSaveSpool}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-all font-semibold"
                    >
                      Guardar
                    </button>
                    {stockForm.id && (
                      <button
                        type="button"
                        onClick={resetStockForm}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-all font-semibold"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Ajustar gramos</h3>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Spool</label>
                    <select
                      value={adjustTargetId}
                      onChange={(event) => setAdjustTargetId(event.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white"
                    >
                      <option value="">Seleccionar spool</option>
                      {materialStock.map((spool) => (
                        <option key={spool.id} value={spool.id}>
                          {spool.displayName}
                          {spool.isDemo ? " · Demo" : ""} · {spool.gramsAvailable}g
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Gramos a ajustar</label>
                    <input
                      type="number"
                      value={adjustGrams}
                      onChange={(event) => setAdjustGrams(event.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleAdjustStock("add")}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all font-semibold"
                    >
                      Sumar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustStock("subtract")}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all font-semibold"
                    >
                      Restar
                    </button>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </section>
        )}

        {activeSection === "profitability" && SHOW_PROFITABILITY_SECTION && (
          <section className="max-w-5xl mx-auto mt-10">
            <div className="bg-white rounded-3xl shadow-2xl p-8 relative">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Análisis de rentabilidad</h2>
                  <p className="text-sm text-gray-600">Basado en tu historial. No tenés que cargar nada de nuevo.</p>
                </div>
                <span className="bg-purple-100 text-purple-600 text-xs font-semibold px-3 py-1 rounded-full">PRO</span>
              </div>

              {isProEnabled && !hasProfitabilityData ? (
                <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-6 text-center text-sm text-gray-500">
                  Guardá tu primera cotización para ver el análisis.
                </div>
              ) : (
                <div className={`mt-6 space-y-6 ${isProEnabled ? "" : "blur-sm opacity-60 pointer-events-none"}`}>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 rounded-2xl border border-gray-200 p-5">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Ganancia total</p>
                      <p className="mt-2 text-2xl font-bold text-gray-800">
                        {isProEnabled ? formatCurrency(profitability.totalProfit) : "—"}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl border border-gray-200 p-5">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Margen promedio</p>
                      <p className="mt-2 text-2xl font-bold text-gray-800">
                        {isProEnabled ? formatPercent(profitability.averageMargin) : "—"}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl border border-gray-200 p-5">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Producto más rentable</p>
                      <p className="mt-2 text-lg font-semibold text-gray-800">
                        {isProEnabled ? profitability.mostProfitable?.productName || "—" : "—"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {isProEnabled && profitability.mostProfitable
                          ? formatCurrency(profitability.mostProfitable.profit)
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-2xl border border-gray-200 p-5">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Top por ganancia</h3>
                      <div className="space-y-3 text-sm">
                        {(isProEnabled ? profitability.topByProfit : previewTopByProfit).map((item) => (
                          <div key={item.key} className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-800">{item.productName}</p>
                              <p className="text-xs text-gray-500">{item.category}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-800">
                                {isProEnabled ? formatCurrency(item.profit) : "—"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {isProEnabled ? formatPercent(item.margin) : "—"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl border border-gray-200 p-5">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Top por margen</h3>
                      <div className="space-y-3 text-sm">
                        {(isProEnabled ? profitability.topByMargin : previewTopByMargin).map((item) => (
                          <div key={item.key} className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-800">{item.productName}</p>
                              <p className="text-xs text-gray-500">{item.category}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-800">
                                {isProEnabled ? formatCurrency(item.profit) : "—"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {isProEnabled ? formatPercent(item.margin) : "—"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl border border-gray-200 p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Últimas cotizaciones</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                            <th className="py-2">Fecha</th>
                            <th className="py-2">Producto</th>
                            <th className="py-2">Categoría</th>
                            <th className="py-2 text-right">Total</th>
                            <th className="py-2 text-right">Ganancia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(isProEnabled ? profitability.recentQuotes : previewRecentQuotes).map((item) => (
                            <tr key={item.id} className="border-t border-gray-200">
                              <td className="py-2 text-gray-600">{item.date}</td>
                              <td className="py-2 font-semibold text-gray-800">{item.productName}</td>
                              <td className="py-2 text-gray-600">{item.category}</td>
                              <td className="py-2 text-right text-gray-700">
                                {isProEnabled ? formatCurrency(item.revenue) : "—"}
                              </td>
                              <td className="py-2 text-right text-gray-700">
                                {isProEnabled ? formatCurrency(item.profit) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {!isProEnabled && (
                <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-white/70">
                  <div className="text-center px-6">
                    <p className="text-sm text-gray-600 mb-4">
                      Desbloqueá el análisis completo con Costly3D PRO.
                    </p>
                    <button
                      type="button"
                      className="bg-gradient-to-r from-blue-500 to-green-500 text-white font-semibold px-5 py-3 rounded-xl hover:from-blue-600 hover:to-green-600 transition-all"
                      onClick={() => handleOpenProModal("cta")}
                    >
                      Acceso anticipado PRO
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
        {activeSection === "profitability" && !SHOW_PROFITABILITY_SECTION && (
          <section className="max-w-5xl mx-auto mt-10">
            <div className="bg-white rounded-3xl shadow-2xl p-8">
              <h2 className="text-2xl font-bold text-gray-800">Rentabilidad</h2>
              <p className="mt-2 text-sm text-gray-600">Esta sección estará disponible muy pronto.</p>
            </div>
          </section>
        )}

        {activeSection === "branding" && (
          <section className="max-w-5xl mx-auto mt-10">
            <div className="bg-white rounded-3xl shadow-2xl p-8">
              <h2 className="text-2xl font-bold text-gray-800">Branding</h2>
              <p className="mt-2 text-sm text-gray-600">Personalizá logo y colores de tus cotizaciones.</p>
              <div className="mt-6 rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-gray-500">
                Próximamente vas a poder ajustar tu identidad visual desde aquí.
              </div>
            </div>
          </section>
        )}

        {activeSection === "settings" && (
          <section className="max-w-5xl mx-auto mt-10">
            <div className="bg-white rounded-3xl shadow-2xl p-8">
              <h2 className="text-2xl font-bold text-gray-800">Configuración</h2>
              <p className="mt-2 text-sm text-gray-600">Ajustes generales de la app.</p>
              <div className="mt-6 rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-gray-500">
                Sección en construcción.
              </div>
            </div>
          </section>
        )}

        {activeSection === "branding" && (
          <section className="max-w-5xl mx-auto mt-10">
            <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Funciones PRO (en desarrollo)</h2>
                <p className="text-sm text-gray-600">
                  Basado en tu historial y cotizaciones guardadas. No tenés que cargar datos de nuevo.
                </p>
              </div>
              <span className="bg-purple-100 text-purple-600 text-xs font-semibold px-3 py-1 rounded-full">PRO</span>
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Documentos y marca</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  {
                    title: "Personalización de marca",
                    description: "Tus cotizaciones con tu logo y nombre de negocio.",
                    bullets: ["Logo + nombre en documentos", "Estilo consistente en PDFs"],
                    status: "Disponible en PRO",
                  },
                  {
                    title: "Exportar cotizaciones",
                    description: "Cotizaciones listas para enviar a clientes.",
                    bullets: ["PDF profesional", "Excel para control interno"],
                    status: "Disponible en PRO",
                  },
                  {
                    title: "Reporte mensual",
                    description: "Resumen mensual de cotizaciones e ingresos.",
                    bullets: ["Totales y promedio", "Top productos del mes"],
                    status: "Disponible en PRO",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    title="Disponible en versión PRO"
                    className="relative rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-5 opacity-60"
                  >
                    <span className="absolute right-4 top-4 bg-slate-900 text-white text-[10px] font-semibold px-2 py-1 rounded-full">
                      PRO
                    </span>
                    <div className="flex items-start gap-3">
                      <div className="mt-1 text-slate-400">
                        <Lock size={20} />
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-gray-800 mb-1">{item.title}</h4>
                        <p className="text-sm text-gray-600">{item.description}</p>
                        <ul className="mt-2 text-xs text-gray-500 space-y-1">
                          {item.bullets.map((bullet) => (
                            <li key={bullet}>• {bullet}</li>
                          ))}
                        </ul>
                        <span className="inline-flex mt-3 text-xs text-slate-500">{item.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Control del negocio</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  {
                    title: "Análisis de rentabilidad",
                    description: "Saber cuánto ganás realmente por producto.",
                    bullets: ["Ganancia neta y margen real", "Ranking por ganancia y por margen"],
                    status: SHOW_PROFITABILITY_SECTION ? "Disponible en PRO" : "En desarrollo",
                  },
                  {
                    title: "Historial ilimitado",
                    description: "Guardá todo tu historial sin límites.",
                    bullets: ["Productos ilimitados", "Reutilizá cotizaciones y versiones"],
                    status: "Disponible en PRO",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    title="Disponible en versión PRO"
                    className="relative rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-5 opacity-60"
                  >
                    <span className="absolute right-4 top-4 bg-slate-900 text-white text-[10px] font-semibold px-2 py-1 rounded-full">
                      PRO
                    </span>
                    <div className="flex items-start gap-3">
                      <div className="mt-1 text-slate-400">
                        <Lock size={20} />
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-gray-800 mb-1">{item.title}</h4>
                        <p className="text-sm text-gray-600">{item.description}</p>
                        <ul className="mt-2 text-xs text-gray-500 space-y-1">
                          {item.bullets.map((bullet) => (
                            <li key={bullet}>• {bullet}</li>
                          ))}
                        </ul>
                        <span className="inline-flex mt-3 text-xs text-slate-500">{item.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Costos avanzados y decisiones</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  {
                    title: "Costos fijos y amortización",
                    description: "Distribuí costos invisibles en tus precios.",
                    bullets: ["Mantenimiento y desgaste", "Tiempo improductivo y costos fijos"],
                    status: "En desarrollo",
                  },
                  {
                    title: "Comparador de escenarios",
                    description: "Compará precios y márgenes antes de decidir.",
                    bullets: ["Variar material, tiempo y margen", "Elegí la opción más rentable"],
                    status: "En desarrollo",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    title="Disponible en versión PRO"
                    className="relative rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-5 opacity-60"
                  >
                    <span className="absolute right-4 top-4 bg-slate-900 text-white text-[10px] font-semibold px-2 py-1 rounded-full">
                      PRO
                    </span>
                    <div className="flex items-start gap-3">
                      <div className="mt-1 text-slate-400">
                        <Lock size={20} />
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-gray-800 mb-1">{item.title}</h4>
                        <p className="text-sm text-gray-600">{item.description}</p>
                        <ul className="mt-2 text-xs text-gray-500 space-y-1">
                          {item.bullets.map((bullet) => (
                            <li key={bullet}>• {bullet}</li>
                          ))}
                        </ul>
                        <span className="inline-flex mt-3 text-xs text-slate-500">{item.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            </div>
          </section>
        )}
          </main>
        </div>
      </div>
      {isConfirmModalOpen && confirmTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={closeConfirmModal}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Confirmar pedido"
          >
            <h3 className="text-2xl font-bold text-gray-900">Confirmar pedido</h3>
            <p className="mt-3 text-sm text-gray-600">
              Esta acción confirma el pedido y lo deja listo para iniciar impresión.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              <li>• Bloqueará la edición de la cotización</li>
              <li>• No descuenta filamento todavía</li>
              <li>• No impacta reportes hasta finalizar la impresión</li>
            </ul>
            <p className="mt-4 text-sm font-semibold text-red-500">⚠️ Esta acción no se puede deshacer.</p>
            <p className="mt-2 text-sm text-gray-600">¿Deseas continuar?</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={closeConfirmModal}
                className="bg-gray-100 text-gray-700 font-semibold px-5 py-3 rounded-xl hover:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmProduction}
                className="bg-gradient-to-r from-blue-500 to-green-500 text-white font-semibold px-5 py-3 rounded-xl hover:from-blue-600 hover:to-green-600 transition-all"
              >
                Confirmar pedido
              </button>
            </div>
          </div>
        </div>
      )}
      {stockModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() =>
            setStockModal({
              open: false,
              available: 0,
              required: 0,
              recordId: null,
              selectedMaterialId: "",
              resumeFailure: false,
            })
          }
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Stock insuficiente"
          >
            <h3 className="text-2xl font-bold text-gray-900">Stock insuficiente</h3>
            <p className="mt-3 text-sm text-gray-600">
              El spool seleccionado no tiene material suficiente para esta impresión.
            </p>
            <p className="mt-4 text-sm text-gray-700">
              Disponible: <span className="font-semibold">{stockModal.available.toFixed(0)} g</span>
            </p>
            <p className="text-sm text-gray-700">
              Requerido: <span className="font-semibold">{stockModal.required.toFixed(0)} g</span>
            </p>
            <p className="mt-4 text-sm text-gray-600">
              Ajusta el stock o selecciona otro filamento antes de continuar.
            </p>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Elegí un filamento en stock</label>
              <select
                value={stockModal.selectedMaterialId}
                onChange={(event) =>
                  setStockModal((prev) => ({ ...prev, selectedMaterialId: event.target.value }))
                }
                className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white"
              >
                <option value="">Seleccionar filamento</option>
                {materialStock
                  .filter((spool) => spool.gramsAvailable > 0)
                  .map((spool) => (
                    <option key={spool.id} value={spool.id}>
                      {spool.displayName}
                      {spool.isDemo ? " · Demo" : ""} · {spool.gramsAvailable}g
                    </option>
                  ))}
              </select>
              <p className="mt-2 text-xs text-gray-500">
                Podés cambiar el filamento para continuar con la impresión.
              </p>
            </div>
            <div className="mt-6">
              {stockModal.recordId && stockModal.selectedMaterialId && (
                <button
                  type="button"
                  onClick={() => {
                    applyMaterialSelection(stockModal.recordId ?? "", stockModal.selectedMaterialId);
                    setStockModal({
                      open: false,
                      available: 0,
                      required: 0,
                      recordId: null,
                      selectedMaterialId: "",
                      resumeFailure: false,
                    });
                    if (stockModal.resumeFailure && failureTarget) {
                      setIsFailureModalOpen(true);
                    }
                  }}
                  className="bg-blue-500 text-white font-semibold px-5 py-3 rounded-xl hover:bg-blue-600 transition-all mr-3"
                >
                  Usar este filamento
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  setStockModal({
                    open: false,
                    available: 0,
                    required: 0,
                    recordId: null,
                    selectedMaterialId: "",
                    resumeFailure: false,
                  })
                }
                className="bg-blue-500 text-white font-semibold px-5 py-3 rounded-xl hover:bg-blue-600 transition-all"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
      {isFailureModalOpen && failureTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => closeFailureModal()}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Registrar impresión fallida"
          >
            <h3 className="text-2xl font-bold text-gray-900">Registrar impresión fallida</h3>
            <p className="mt-3 text-sm text-gray-600">
              Esta acción registrará una pérdida real de material y no se puede deshacer.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Porcentaje impreso</label>
                <input
                  type="range"
                  min={0}
                  max={99}
                  value={failurePercent}
                  onChange={(event) => setFailurePercent(Number(event.target.value))}
                  className="w-full"
                />
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={failurePercent}
                    onChange={(event) => setFailurePercent(Number(event.target.value))}
                    className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              </div>

              {(() => {
                const required = getRequiredGramsForRecord(failureTarget);
                const percent = Math.min(100, Math.max(0, failurePercent));
                const gramsLost = (required * percent) / 100;
                const gramsRecovered = Math.max(0, required - gramsLost);
                return (
                  <div className="rounded-2xl border border-gray-200 bg-slate-50 p-4 text-sm text-gray-700">
                    <p className="font-semibold text-gray-800">Resumen de material</p>
                    <p className="mt-2">
                      Filamento perdido:{" "}
                      <span className="font-semibold text-red-500">{gramsLost.toFixed(0)} g</span>
                    </p>
                    <p className="mt-1">
                      Filamento recuperado:{" "}
                      <span className="font-semibold text-emerald-600">{gramsRecovered.toFixed(0)} g</span>
                    </p>
                  </div>
                );
              })()}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nota del fallo (opcional)</label>
                <textarea
                  value={failureNote}
                  onChange={(event) => setFailureNote(event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Ej: se desprendió el soporte en la mitad de la impresión."
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => closeFailureModal()}
                className="bg-gray-100 text-gray-700 font-semibold px-5 py-3 rounded-xl hover:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmFailure}
                className="bg-red-500 text-white font-semibold px-5 py-3 rounded-xl hover:bg-red-600 transition-all"
              >
                Confirmar fallo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
