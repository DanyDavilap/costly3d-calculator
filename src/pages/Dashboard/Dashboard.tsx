
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
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
  BookOpen,
  FolderKanban,
  Save,
  Trash2,
  Lock,
  Pencil,
  ArrowRightCircle,
  Play,
  CheckCircle,
  Check,
  XCircle,
  Copy,
  AlertTriangle,
  Download,
  Sparkles,
  Rocket,
  FileText,
  Factory,
  Palette,
  Settings,
  Target,
} from "lucide-react";
import {
  pricingCalculator,
  PricingBreakdown,
  PricingInputs,
  PricingParams,
} from "../../utils/pricingCalculator";
import { calculateMonthlyMetrics } from "../../utils/monthlyMetrics";
import {
  calcularConsumoImpresiones,
  type ImpresionConsumoInput,
} from "../../utils/consumoImpresiones";
import { exportarExcel, exportarPDF, type ReporteExportData } from "../../utils/reporteExports";
import { BRANDING_ACTIVO, activarBranding } from "../../utils/brandingActivation";
import ColorPicker, { type ColorOption } from "../../components/ui/ColorPicker";
import {
  createPdfTheme,
  formatDate,
  formatMoney,
  renderFooter,
  renderHeader,
  DEFAULT_BRAND,
  type BrandSettings,
} from "../../utils/pdfTheme";
import { BRAND_STORAGE_KEY, loadBrandSettings, saveBrandSettings } from "../../utils/brandSettings";
import { isDev, isProUser, type UserPlan } from "../../utils/proPermissions";
import { isDarkModeEnabled, toggleDarkMode } from "../../utils/theme";
import type { AccessProfile, FeatureFlags } from "../../context/AuthContext";
import {
  compararEscenariosV1,
  type EscenarioComparadorV1Input,
} from "../../utils/escenariosComparadorV1";
import WikiLayout from "../../wiki/components/WikiLayout";

type PrintStatus = "cotizada" | "en_produccion" | "finalizada_ok" | "finalizada_fallida";
type ProjectPieceStatus = "pendiente" | "impresa" | "fallida";

interface FailureDetails {
  date: string;
  percentPrinted: number;
  gramsLost?: number;
  gramsRecovered?: number;
  materialCostLost?: number;
  energyCostLost?: number;
  lostCost?: number;
  lostGrams?: number;
  reason?: string;
  note?: string;
}

interface HistoryRecord {
  id: string;
  date: string;
  createdAt?: string | null;
  duplicatedFrom?: string | null;
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
  completedAt?: string | null;
  reprintOfId?: string | null;
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

interface ProjectPiece {
  id: string;
  projectId: string;
  partName: string;
  color: string;
  materialId: string;
  grams: number;
  estimatedTime: number;
  quantity: number;
  plate: string;
  status: ProjectPieceStatus;
  amsSlot?: string;
  notes?: string;
}

interface Project {
  id: string;
  name: string;
  category: string;
  description?: string;
  createdAt: string;
  pieces: ProjectPiece[];
}

interface MarketingProfile {
  businessName: string;
  focus: string;
  salesChannel: string;
  weeklyCapacityHours: string;
  targetMargin: string;
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
const PROJECTS_STORAGE_KEY = "projects";
const MARKETING_PROFILE_KEY = "marketingProfile";
const FREE_PRODUCT_LIMIT = 3;
const SHOW_PROFITABILITY_SECTION = true;
// Comparador desactivado temporalmente: reactivar cuando el producto lo requiera.
const ENABLE_COMPARATOR = false;
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
const MARKETING_FOCUS_OPTIONS = [
  "Regalos personalizados",
  "Decoración y hogar",
  "Piezas funcionales",
  "Prototipos y pruebas",
  "Miniaturas y hobbies",
  "Otro",
];
const MARKETING_CHANNEL_OPTIONS = [
  "Pedidos directos",
  "Clientes recurrentes",
  "Marketplace / tienda online",
  "B2B / empresas",
  "Ferias y locales",
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

const DEFAULT_MARKETING_PROFILE: MarketingProfile = {
  businessName: "",
  focus: "",
  salesChannel: MARKETING_CHANNEL_OPTIONS[0] ?? "",
  weeklyCapacityHours: "",
  targetMargin: "",
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
    const available = record.status === "cotizada" ? record.quantity || 0 : 0;
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
    legacyStatus === "draft" || legacyStatus === "cotizado" || legacyStatus === "cotizada"
      ? "cotizada"
      : legacyStatus === "confirmado" || legacyStatus === "en_produccion"
        ? "en_produccion"
        : legacyStatus === "produced" || legacyStatus === "producido" || legacyStatus === "finalizado"
          ? "finalizada_ok"
          : legacyStatus === "fallido"
            ? "finalizada_fallida"
            : "cotizada";
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
      ? (() => {
          const percentPrinted =
            typeof (rawFailure as FailureDetails).percentPrinted === "number"
              ? (rawFailure as FailureDetails).percentPrinted
              : typeof (rawFailure as unknown as { percentFailed?: number }).percentFailed === "number"
                ? (rawFailure as unknown as { percentFailed: number }).percentFailed
                : 0;
          const lostGramsValue =
            typeof (rawFailure as FailureDetails).lostGrams === "number"
              ? (rawFailure as FailureDetails).lostGrams
              : typeof (rawFailure as FailureDetails).gramsLost === "number"
                ? (rawFailure as FailureDetails).gramsLost
                : undefined;
          const materialCostLost =
            typeof (rawFailure as FailureDetails).materialCostLost === "number"
              ? (rawFailure as FailureDetails).materialCostLost
              : undefined;
          const energyCostLost =
            typeof (rawFailure as FailureDetails).energyCostLost === "number"
              ? (rawFailure as FailureDetails).energyCostLost
              : undefined;
          const lostCostValue =
            typeof (rawFailure as FailureDetails).lostCost === "number"
              ? (rawFailure as FailureDetails).lostCost
              : materialCostLost !== undefined || energyCostLost !== undefined
                ? (materialCostLost ?? 0) + (energyCostLost ?? 0)
                : undefined;

          return {
            ...rawFailure,
            percentPrinted,
            lostGrams: lostGramsValue,
            lostCost: lostCostValue,
          };
        })()
      : null;
  const stockDeductedGrams =
    typeof (raw as HistoryRecord).stockDeductedGrams === "number"
      ? (raw as HistoryRecord).stockDeductedGrams
      : status === "finalizada_ok"
        ? materialGramsUsed
        : status === "finalizada_fallida"
          ? failure?.lostGrams ?? failure?.gramsLost ?? 0
          : 0;

  return {
    id: raw.id ?? Date.now().toString(),
    date: raw.date ?? new Date().toLocaleDateString("es-AR"),
    createdAt:
      (raw as HistoryRecord).createdAt ??
      (raw as HistoryRecord).startedAt ??
      (raw as HistoryRecord).date ??
      new Date().toISOString(),
    duplicatedFrom: (raw as HistoryRecord).duplicatedFrom ?? null,
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
    completedAt: (raw as HistoryRecord).completedAt ?? null,
    reprintOfId: (raw as HistoryRecord).reprintOfId ?? null,
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

const loadStoredProjects = (): Project[] => {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((project) => ({
        id: String(project.id ?? Date.now().toString()),
        name: String(project.name ?? "Proyecto"),
        category: String(project.category ?? "General"),
        description: typeof project.description === "string" ? project.description : "",
        createdAt: String(project.createdAt ?? new Date().toISOString()),
        pieces: Array.isArray(project.pieces)
          ? project.pieces.map((piece: ProjectPiece) => ({
              id: String(piece.id ?? Date.now().toString()),
              projectId: String(piece.projectId ?? project.id ?? ""),
              partName: String(piece.partName ?? "Parte"),
              color: String(piece.color ?? ""),
              materialId: String(piece.materialId ?? ""),
              grams: Number.isFinite(piece.grams) ? Number(piece.grams) : 0,
              estimatedTime: Number.isFinite(piece.estimatedTime) ? Number(piece.estimatedTime) : 0,
              quantity: Number.isFinite(piece.quantity) ? Number(piece.quantity) : 1,
              plate: String(piece.plate ?? ""),
              status:
                piece.status === "impresa" || piece.status === "fallida" || piece.status === "pendiente"
                  ? piece.status
                  : "pendiente",
              amsSlot: piece.amsSlot ? String(piece.amsSlot) : "",
              notes: piece.notes ? String(piece.notes) : "",
            }))
          : [],
      }))
      .filter((project) => Boolean(project.name));
  } catch (error) {
    return [];
  }
};

const loadMarketingProfile = (): MarketingProfile => {
  if (typeof window === "undefined") return DEFAULT_MARKETING_PROFILE;
  const saved = localStorage.getItem(MARKETING_PROFILE_KEY);
  if (!saved) return DEFAULT_MARKETING_PROFILE;
  try {
    const parsed = JSON.parse(saved);
    return {
      ...DEFAULT_MARKETING_PROFILE,
      businessName: typeof parsed.businessName === "string" ? parsed.businessName : "",
      focus: typeof parsed.focus === "string" ? parsed.focus : "",
      salesChannel: typeof parsed.salesChannel === "string" ? parsed.salesChannel : DEFAULT_MARKETING_PROFILE.salesChannel,
      weeklyCapacityHours:
        typeof parsed.weeklyCapacityHours === "string"
          ? parsed.weeklyCapacityHours
          : parsed.weeklyCapacityHours?.toString?.() ?? "",
      targetMargin:
        typeof parsed.targetMargin === "string"
          ? parsed.targetMargin
          : parsed.targetMargin?.toString?.() ?? "",
    };
  } catch (error) {
    return DEFAULT_MARKETING_PROFILE;
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
  access?: AccessProfile;
};

type DashboardSection =
  | "calculator"
  | "quotations"
  | "production"
  | "scenarios"
  | "projects"
  | "wiki"
  | "stock"
  | "reports"
  | "profitability"
  | "marketing"
  | "branding"
  | "settings";

function Dashboard({ onOpenProModal, access }: DashboardProps) {
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
  const [projects, setProjects] = useState<Project[]>(() => loadStoredProjects());
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [newProjectDraft, setNewProjectDraft] = useState({
    name: "",
    category: "General",
    description: "",
  });
  const [marketingProfile, setMarketingProfile] = useState<MarketingProfile>(() => loadMarketingProfile());
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
  });
  const [isFailureModalOpen, setIsFailureModalOpen] = useState(false);
  const [failureTarget, setFailureTarget] = useState<HistoryRecord | null>(null);
  const [failurePercent, setFailurePercent] = useState(50);
  const [failureNote, setFailureNote] = useState("");
  const [failureDetailTarget, setFailureDetailTarget] = useState<HistoryRecord | null>(null);
  const isCalculatingRef = useRef(false);
  const lastSavedSignatureRef = useRef<string | null>(null);
  const [saveBanner, setSaveBanner] = useState<{
    type: "success" | "error";
    message: string;
    description?: string;
  } | null>(null);
  const saveBannerTimerRef = useRef<number | null>(null);
  const [brand, setBrand] = useState<BrandSettings>(() => loadBrandSettings());
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
  const reportCardsRef = useRef<HTMLDivElement | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => isDarkModeEnabled());
  const devModeEnabled = isDev();
  const [devResetTarget, setDevResetTarget] = useState<
    "all" | "stock" | "quotes" | "production" | "failed" | "seed" | null
  >(null);
  const [scenarioInputs, setScenarioInputs] = useState<EscenarioComparadorV1Input[]>(() => [
    {
      id: "escenario-1",
      nombre: "Escenario A",
      cantidadImpresiones: 10,
      precioUnitario: 6000,
      costoMaterialPorGramo: 30,
      gramosPorImpresion: 120,
      costoEnergiaPorImpresion: 180,
      porcentajeFallos: 10,
      porcentajeImpresoFallida: 50,
    },
    {
      id: "escenario-2",
      nombre: "Escenario B",
      cantidadImpresiones: 10,
      precioUnitario: 7000,
      costoMaterialPorGramo: 28,
      gramosPorImpresion: 110,
      costoEnergiaPorImpresion: 160,
      porcentajeFallos: 6,
      porcentajeImpresoFallida: 40,
    },
  ]);

  useEffect(() => {
    localStorage.setItem(PARAMS_STORAGE_KEY, JSON.stringify(params));
  }, [params]);

  useEffect(() => {
    localStorage.setItem(CATEGORY_STORAGE_KEY, category.trim() || "General");
  }, [category]);

  useEffect(() => {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(MARKETING_PROFILE_KEY, JSON.stringify(marketingProfile));
  }, [marketingProfile]);

  useEffect(() => {
    if (ENABLE_COMPARATOR) return;
    // Evitar acceso directo al comparador mientras esté desactivado.
    if (activeSection === "scenarios") {
      setActiveSection("calculator");
    }
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "projects") return;
    if (activeProjectId || projects.length === 0) return;
    setActiveProjectId(projects[0].id);
  }, [activeSection, activeProjectId, projects]);

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

  const handleToggleDarkMode = () => {
    const next = toggleDarkMode();
    setIsDarkMode(next === "dark");
  };

  const calculateProjectTotals = (project: Project) => {
    const totals = project.pieces.reduce(
      (acc, piece) => {
        const quantity = Number.isFinite(piece.quantity) ? piece.quantity : 0;
        acc.grams += (piece.grams || 0) * quantity;
        acc.time += (piece.estimatedTime || 0) * quantity;
        acc.pieces += quantity;
        return acc;
      },
      { grams: 0, time: 0, pieces: 0 },
    );
    return totals;
  };

  const createProject = (draft?: { name?: string; category?: string; description?: string }) => {
    const id = `project-${Date.now()}`;
    const safeName = draft?.name?.trim() || "Nuevo proyecto";
    const safeCategory = draft?.category?.trim() || "General";
    const safeDescription = draft?.description?.trim() || "";
    const newProject: Project = {
      id,
      name: safeName,
      category: safeCategory,
      description: safeDescription,
      createdAt: new Date().toISOString(),
      pieces: [],
    };
    setProjects((prev) => [newProject, ...prev]);
    setActiveProjectId(id);
    setActiveSection("projects");
  };

  const handleCreateProject = () => {
    createProject({
      name: newProjectDraft.name,
      category: newProjectDraft.category,
      description: newProjectDraft.description,
    });
    setNewProjectDraft((prev) => ({
      name: "",
      category: prev.category?.trim() || "General",
      description: "",
    }));
  };

  const updateProject = (projectId: string, updates: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((project) => (project.id === projectId ? { ...project, ...updates } : project)),
    );
  };

  const addProjectPiece = (projectId: string) => {
    const newPiece: ProjectPiece = {
      id: `piece-${Date.now()}`,
      projectId,
      partName: "",
      color: "",
      materialId: "",
      grams: 0,
      estimatedTime: 0,
      quantity: 1,
      plate: "",
      status: "pendiente",
      amsSlot: "",
      notes: "",
    };
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId ? { ...project, pieces: [...project.pieces, newPiece] } : project,
      ),
    );
  };

  const updateProjectPiece = (projectId: string, pieceId: string, updates: Partial<ProjectPiece>) => {
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== projectId) return project;
        return {
          ...project,
          pieces: project.pieces.map((piece) =>
            piece.id === pieceId ? { ...piece, ...updates } : piece,
          ),
        };
      }),
    );
  };

  const removeProjectPiece = (projectId: string, pieceId: string) => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId
          ? { ...project, pieces: project.pieces.filter((piece) => piece.id !== pieceId) }
          : project,
      ),
    );
  };

  const duplicateProject = (project: Project) => {
    const newId = `project-${Date.now()}`;
    const duplicated: Project = {
      ...project,
      id: newId,
      name: `${project.name} (copia)`,
      createdAt: new Date().toISOString(),
      pieces: project.pieces.map((piece) => ({
        ...piece,
        id: `piece-${Date.now()}-${piece.id}`,
        projectId: newId,
      })),
    };
    setProjects((prev) => [duplicated, ...prev]);
    setActiveProjectId(newId);
  };

  const convertProjectToQuote = (project: Project) => {
    const totals = calculateProjectTotals(project);
    if (totals.grams <= 0 || totals.time <= 0) {
      toast.info("Completá gramos y tiempo estimado para convertir el proyecto.");
      return;
    }
    const inputs: PricingInputs = {
      timeMinutes: totals.time * 60,
      materialGrams: totals.grams,
      assemblyMinutes: 0,
    };
    const breakdown = pricingCalculator({ inputs, params });
    const newRecord: HistoryRecord = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("es-AR"),
      createdAt: new Date().toISOString(),
      duplicatedFrom: null,
      name: project.name,
      productName: project.name,
      category: project.category || "General",
      inputs,
      params,
      breakdown,
      total: breakdown.finalPrice,
      selectedMaterialId: "",
      materialGramsUsed: 0,
      materialType: null,
      materialColorName: null,
      materialBrand: null,
      quantity: 1,
      status: "cotizada",
      stockDeductedGrams: 0,
      startedAt: null,
      completedAt: null,
      reprintOfId: null,
      failure: null,
      stockChanges: [],
    };
    const saved = persistHistory([newRecord, ...records]);
    if (saved) {
      toast.success("Proyecto convertido en cotización.");
      setActiveSection("quotations");
    }
  };

  const updateScenarioField = (
    id: string,
    field: keyof EscenarioComparadorV1Input,
    value: string,
  ) => {
    setScenarioInputs((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === "nombre") {
          return { ...item, [field]: value };
        }
        const numericValue = Number.parseFloat(value);
        return { ...item, [field]: Number.isNaN(numericValue) ? 0 : numericValue };
      }),
    );
  };

  const addScenario = () => {
    const nextIndex = scenarioInputs.length + 1;
    setScenarioInputs((prev) => [
      ...prev,
      {
        id: `escenario-${Date.now()}`,
        nombre: `Escenario ${nextIndex}`,
        cantidadImpresiones: 10,
        precioUnitario: 6000,
        costoMaterialPorGramo: 30,
        gramosPorImpresion: 120,
        costoEnergiaPorImpresion: 180,
        porcentajeFallos: 8,
        porcentajeImpresoFallida: 50,
      },
    ]);
  };

  const removeScenario = (id: string) => {
    setScenarioInputs((prev) => prev.filter((item) => item.id !== id));
  };

  const closeDevResetModal = () => {
    setDevResetTarget(null);
  };

  const resetAllDataDev = () => {
    const safeRemove = (key: string) => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        // Ignore storage errors to avoid blocking the reset.
      }
    };

    [PARAMS_STORAGE_KEY, HISTORY_STORAGE_KEY, STOCK_STORAGE_KEY, CATEGORY_STORAGE_KEY, MATERIAL_STOCK_KEY, BRAND_STORAGE_KEY].forEach(
      safeRemove,
    );
  };

  const loadDemoSeeds = () => {
    if (!devModeEnabled) return;

    closeDevResetModal();
    resetAllDataDev();

    const demoStock: MaterialSpool[] = [
      {
        id: "demo-pla-negro",
        displayName: "PLA · Negro · Printalot",
        brand: "Printalot",
        materialType: "PLA",
        color: { name: "Negro", hex: "#111827" },
        gramsAvailable: 4000,
      },
      {
        id: "demo-pla-blanco",
        displayName: "PLA · Blanco · Printalot",
        brand: "Printalot",
        materialType: "PLA",
        color: { name: "Blanco", hex: "#F8FAFC" },
        gramsAvailable: 2000,
      },
      {
        id: "demo-petg-gris",
        displayName: "PETG · Gris · Bambu Lab",
        brand: "Bambu Lab",
        materialType: "PETG",
        color: { name: "Gris", hex: "#9CA3AF" },
        gramsAvailable: 1500,
      },
      {
        id: "demo-pla-rojo",
        displayName: "PLA · Rojo · Genérico",
        brand: "Genérico",
        materialType: "PLA",
        color: { name: "Rojo", hex: "#EF4444" },
        gramsAvailable: 1000,
      },
    ];

    const toDateLabel = (date: Date) => date.toLocaleDateString("es-AR");
    const today = new Date();
    const dateOffsets = [3, 6, 10, 15].map((offset) => {
      const next = new Date(today);
      next.setDate(today.getDate() - offset);
      return toDateLabel(next);
    });

    const buildDemoRecord = ({
      name,
      categoryLabel,
      materialId,
      grams,
      timeMinutes,
      assemblyMinutes,
      status,
      failurePercent,
      profitPercent,
      dateLabel,
    }: {
      name: string;
      categoryLabel: string;
      materialId: string;
      grams: number;
      timeMinutes: number;
      assemblyMinutes: number;
      status: PrintStatus;
      failurePercent?: number;
      profitPercent?: number;
      dateLabel: string;
    }): HistoryRecord => {
      const inputs = { timeMinutes, materialGrams: grams, assemblyMinutes };
      const paramsSnapshot = { ...params, profitPercent: profitPercent ?? params.profitPercent };
      const breakdown = pricingCalculator({ inputs, params: paramsSnapshot });
      const spool = demoStock.find((item) => item.id === materialId);
      const requiredGrams = grams;
      const isFailed = status === "finalizada_fallida";
      const percentPrinted = Math.min(99, Math.max(0, failurePercent ?? 0));
      const lostGrams = isFailed ? (requiredGrams * percentPrinted) / 100 : 0;
      const lostCost = isFailed ? (breakdown.totalCost * percentPrinted) / 100 : 0;
      const failureDetails: FailureDetails | null = isFailed
        ? {
            date: dateLabel,
            percentPrinted,
          lostGrams,
          lostCost,
          gramsLost: lostGrams,
          gramsRecovered: Math.max(0, requiredGrams - lostGrams),
          materialCostLost: (breakdown.materialCost * percentPrinted) / 100,
          energyCostLost: (breakdown.energyCost * percentPrinted) / 100,
          reason: "Datos demo",
          note: "Datos demo",
        }
      : null;

      return {
        id: `demo-${name.replace(/\s+/g, "-").toLowerCase()}-${dateLabel.replace(/\//g, "")}`,
        date: dateLabel,
        createdAt: new Date().toISOString(),
        name,
        productName: name,
        category: categoryLabel,
        inputs,
        params: paramsSnapshot,
        breakdown,
        total: breakdown.finalPrice,
        selectedMaterialId: materialId,
        materialGramsUsed: requiredGrams,
        materialType: spool?.materialType ?? null,
        materialColorName: spool?.color?.name ?? null,
        materialBrand: spool?.brand ?? null,
        quantity: 1,
        status,
        stockDeductedGrams: isFailed ? lostGrams : status === "finalizada_ok" ? requiredGrams : 0,
        startedAt: null,
        completedAt: status === "finalizada_ok" || status === "finalizada_fallida" ? new Date().toISOString() : null,
        reprintOfId: null,
        failure: failureDetails,
        stockChanges: [],
      };
    };

    const demoRecords: HistoryRecord[] = [
      buildDemoRecord({
        name: "Llavero Dragon Ball",
        categoryLabel: "Llaveros",
        materialId: "demo-pla-negro",
        grams: 80,
        timeMinutes: 120,
        assemblyMinutes: 10,
        status: "finalizada_ok",
        profitPercent: 40,
        dateLabel: dateOffsets[0],
      }),
      buildDemoRecord({
        name: "Dummy Wolverine",
        categoryLabel: "Dummy 13",
        materialId: "demo-pla-blanco",
        grams: 600,
        timeMinutes: 420,
        assemblyMinutes: 30,
        status: "finalizada_fallida",
        failurePercent: 65,
        profitPercent: 40,
        dateLabel: dateOffsets[1],
      }),
      buildDemoRecord({
        name: "Indominus Rex",
        categoryLabel: "Juguetes",
        materialId: "demo-petg-gris",
        grams: 350,
        timeMinutes: 300,
        assemblyMinutes: 20,
        status: "finalizada_ok",
        profitPercent: 40,
        dateLabel: dateOffsets[2],
      }),
      buildDemoRecord({
        name: "Soporte Celular",
        categoryLabel: "Accesorios",
        materialId: "demo-pla-rojo",
        grams: 120,
        timeMinutes: 150,
        assemblyMinutes: 12,
        status: "cotizada",
        profitPercent: 40,
        dateLabel: dateOffsets[3],
      }),
    ];

    const adjustedStock = demoStock.map((spool) => {
      const deducted = demoRecords.reduce((sum, record) => {
        if (record.selectedMaterialId !== spool.id) return sum;
        if (record.status === "cotizada") return sum;
        return sum + (record.stockDeductedGrams ?? 0);
      }, 0);
      return {
        ...spool,
        gramsAvailable: Math.max(0, spool.gramsAvailable - deducted),
      };
    });

    persistMaterialStock(adjustedStock);
    persistHistory(demoRecords, { allowDuplicateSignature: true });
    setCategory("General");
    setEditingRecordId(null);
    toast.success("Datos demo cargados correctamente.");
    toast.message("Datos demo — solo desarrollo.");
  };

  const runDevReset = () => {
    if (!devResetTarget) return;

    if (devResetTarget === "all") {
      resetAllDataDev();
    }

    if (devResetTarget === "stock") {
      try {
        localStorage.removeItem(MATERIAL_STOCK_KEY);
        localStorage.removeItem(STOCK_STORAGE_KEY);
      } catch (error) {
        // Ignore storage errors.
      }
    }

    if (devResetTarget === "quotes" || devResetTarget === "production" || devResetTarget === "failed") {
      const statusToRemove =
        devResetTarget === "quotes"
          ? "cotizada"
          : devResetTarget === "production"
            ? "en_produccion"
            : "finalizada_fallida";
      const filtered = records.filter((record) => record.status !== statusToRemove);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filtered));
      localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(buildStockMap(filtered)));
    }

    closeDevResetModal();
    if (devResetTarget === "seed") {
      return;
    }
    window.location.reload();
  };

  const persistMaterialStock = (nextStock: MaterialSpool[]) => {
    localStorage.setItem(MATERIAL_STOCK_KEY, JSON.stringify(nextStock));
    setMaterialStock(nextStock);
  };

  const user: UserPlan = access?.plan ? { plan: access.plan } : null;
  const isProEnabled = isProUser(user);
  const featureFlags: FeatureFlags = access?.features ?? {
    branding: false,
    advancedMetrics: false,
    pdfWatermark: false,
    advancedExports: false,
    quoteExport: true,
  };
  const quoteLimit = access?.maxQuotes ?? FREE_PRODUCT_LIMIT;
  const canBranding = BRANDING_ACTIVO || isProEnabled || featureFlags.branding;
  const canAdvancedMetrics = isProEnabled || featureFlags.advancedMetrics;
  const canAdvancedExport = isProEnabled || featureFlags.advancedExports;
  const canQuoteExport = isProEnabled || featureFlags.quoteExport;
  const shouldWatermarkPdf = featureFlags.pdfWatermark;
  const showStockOnboarding = materialStock.length === 0;
  const showStockBanner =
    showStockOnboarding &&
    (activeSection === "calculator" || activeSection === "quotations" || activeSection === "production");

  const globalMetrics = useMemo(() => calculateMonthlyMetrics(records), [records]);

  const rentabilidadData = useMemo(() => {
    const productMap = new Map<
      string,
      {
        nombre: string;
        categoria: string;
        ingresos: number;
        costos: number;
        cantidad: number;
      }
    >();

    globalMetrics.items.forEach((item) => {
      const nombre = item.productName || "Producto";
      const categoria = item.category || "General";
      const current = productMap.get(nombre);

      if (!current) {
        productMap.set(nombre, {
          nombre,
          categoria,
          ingresos: item.revenueItem,
          costos: item.costTotalItem,
          cantidad: item.isOk ? item.quantity : 0,
        });
        return;
      }

      current.ingresos += item.revenueItem;
      current.costos += item.costTotalItem;
      if (item.isOk) {
        current.cantidad += item.quantity;
      }
      if (!current.categoria || current.categoria === "General") {
        current.categoria = categoria;
      }
    });

    const productosConGanancia = Array.from(productMap.values()).map((item) => {
      const gananciaNeta = item.ingresos - item.costos;
      const margenReal = item.ingresos > 0 ? (gananciaNeta / item.ingresos) * 100 : 0;
      return {
        nombre: item.nombre,
        ingresoTotal: item.ingresos,
        costoTotal: item.costos,
        gananciaNeta,
        margenReal,
        costosFijosAsignados: 0,
        cantidadVendida: item.cantidad,
      };
    });

    const rankingGanancia = [...productosConGanancia].sort((a, b) => b.gananciaNeta - a.gananciaNeta);
    const rankingMargen = [...productosConGanancia].sort((a, b) => b.margenReal - a.margenReal);

    return {
      analisis: {
        productosConGanancia,
        rankingGanancia,
        rankingMargen,
      },
      categorias: new Map(Array.from(productMap.values()).map((item) => [item.nombre, item.categoria])),
    };
  }, [globalMetrics.items]);

  const rentabilidadEntries = rentabilidadData.analisis.productosConGanancia;
  const totalRentabilidadIngresos = rentabilidadEntries.reduce((sum, item) => sum + item.ingresoTotal, 0);
  const totalRentabilidadGanancia = rentabilidadEntries.reduce((sum, item) => sum + item.gananciaNeta, 0);
  const averageRentabilidadMargin =
    totalRentabilidadIngresos > 0 ? (totalRentabilidadGanancia / totalRentabilidadIngresos) * 100 : 0;

  const topByProfit = rentabilidadData.analisis.rankingGanancia.map((item) => ({
    key: item.nombre,
    productName: item.nombre,
    category: rentabilidadData.categorias.get(item.nombre) ?? "General",
    revenue: item.ingresoTotal,
    cost: item.costoTotal,
    profit: item.gananciaNeta,
    margin: item.margenReal,
  }));
  const topByMargin = rentabilidadData.analisis.rankingMargen.map((item) => ({
    key: item.nombre,
    productName: item.nombre,
    category: rentabilidadData.categorias.get(item.nombre) ?? "General",
    revenue: item.ingresoTotal,
    cost: item.costoTotal,
    profit: item.gananciaNeta,
    margin: item.margenReal,
  }));
  const rentabilidadMostProfitable = topByProfit[0] ?? null;

  const recentQuotes = useMemo(() => {
    const entries = records
      .filter((record) => record.status === "finalizada_ok")
      .map((record) => {
        const quantity = typeof record.quantity === "number" && record.quantity > 0 ? record.quantity : 1;
        const revenue = (record.total || record.breakdown.finalPrice) * quantity;
        const cost = record.breakdown.totalCost * quantity;
        const profit = revenue - cost;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
        const timestamp = parseRecordDate(record.date)?.getTime() ?? 0;
        return {
          id: record.id,
          date: record.date,
          productName: record.productName || record.name || "Producto",
          category: record.category || "General",
          revenue,
          cost,
          profit,
          margin,
          timestamp,
        };
      });
    return entries.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [records]);

  const hasProfitabilityData = rentabilidadEntries.length > 0;
  const previewTopByProfit =
    topByProfit.length > 0
      ? topByProfit
      : [
          { key: "preview-profit-1", productName: "—", category: "—", revenue: 0, cost: 0, profit: 0, margin: 0 },
          { key: "preview-profit-2", productName: "—", category: "—", revenue: 0, cost: 0, profit: 0, margin: 0 },
          { key: "preview-profit-3", productName: "—", category: "—", revenue: 0, cost: 0, profit: 0, margin: 0 },
        ];
  const previewTopByMargin =
    topByMargin.length > 0
      ? topByMargin
      : [
          { key: "preview-margin-1", productName: "—", category: "—", revenue: 0, cost: 0, profit: 0, margin: 0 },
          { key: "preview-margin-2", productName: "—", category: "—", revenue: 0, cost: 0, profit: 0, margin: 0 },
          { key: "preview-margin-3", productName: "—", category: "—", revenue: 0, cost: 0, profit: 0, margin: 0 },
        ];
  const previewRecentQuotes =
    recentQuotes.length > 0
      ? recentQuotes
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

  const marketingFailureByProduct = useMemo(() => {
    const map = new Map<
      string,
      {
        successes: number;
        failures: number;
        failureCost: number;
        failureGrams: number;
      }
    >();

    globalMetrics.items.forEach((item) => {
      const productName = item.productName || "Producto";
      const current = map.get(productName) ?? {
        successes: 0,
        failures: 0,
        failureCost: 0,
        failureGrams: 0,
      };

      if (item.isOk) {
        current.successes += item.quantity;
      }

      if (item.isFailed) {
        current.failures += item.quantity;
        current.failureCost += item.failureCostItem;
        current.failureGrams += item.gramsLost;
      }

      map.set(productName, current);
    });

    return map;
  }, [globalMetrics.items]);

  const marketingProducts = useMemo(() => {
    return rentabilidadEntries.map((item) => {
      const failureStats = marketingFailureByProduct.get(item.nombre) ?? {
        successes: 0,
        failures: 0,
        failureCost: 0,
        failureGrams: 0,
      };
      const attempts = failureStats.successes + failureStats.failures;
      const failureRate = attempts > 0 ? (failureStats.failures / attempts) * 100 : 0;

      return {
        key: item.nombre,
        productName: item.nombre,
        category: rentabilidadData.categorias.get(item.nombre) ?? "General",
        revenue: item.ingresoTotal,
        cost: item.costoTotal,
        profit: item.gananciaNeta,
        margin: item.margenReal,
        attempts,
        failures: failureStats.failures,
        failureRate,
        failureCost: failureStats.failureCost,
        failureGrams: failureStats.failureGrams,
      };
    });
  }, [marketingFailureByProduct, rentabilidadData.categorias, rentabilidadEntries]);

  const marketingSummary = useMemo(() => {
    const totals = marketingProducts.reduce(
      (acc, item) => {
        acc.attempts += item.attempts;
        acc.failures += item.failures;
        acc.failureCost += item.failureCost;
        acc.failureGrams += item.failureGrams;
        return acc;
      },
      { attempts: 0, failures: 0, failureCost: 0, failureGrams: 0 },
    );
    const failureRate = totals.attempts > 0 ? (totals.failures / totals.attempts) * 100 : 0;
    return { ...totals, failureRate };
  }, [marketingProducts]);

  const marketingRecommendations = useMemo(() => {
    const parsedTarget = Number.parseFloat(marketingProfile.targetMargin);
    const fallbackTarget = averageRentabilidadMargin > 0 ? averageRentabilidadMargin : 20;
    const targetMargin = Number.isFinite(parsedTarget) ? parsedTarget : fallbackTarget;
    const normalizedTarget = Math.min(100, Math.max(0, targetMargin));

    const sortedByProfit = [...marketingProducts].sort((a, b) => b.profit - a.profit);
    const sellCandidates = sortedByProfit.filter((item) => item.profit > 0);
    const sell = sellCandidates
      .filter((item) => item.margin >= normalizedTarget * 0.8 && item.failureRate <= 20)
      .slice(0, 3);

    if (sell.length < 3) {
      sellCandidates.forEach((item) => {
        if (sell.length >= 3) return;
        if (!sell.some((existing) => existing.productName === item.productName)) {
          sell.push(item);
        }
      });
    }

    const pauseThresholdMargin = Math.min(10, normalizedTarget * 0.6);
    const pause = [...marketingProducts]
      .filter(
        (item) => item.profit <= 0 || item.margin < pauseThresholdMargin || item.failureRate >= 25,
      )
      .sort((a, b) => a.profit - b.profit || b.failureRate - a.failureRate)
      .slice(0, 3);

    const improveTargets = [...marketingProducts]
      .filter((item) => item.failureRate >= 15 || item.failureCost > 0)
      .sort((a, b) => b.failureCost - a.failureCost || b.failureRate - a.failureRate)
      .slice(0, 3);

    return {
      targetMargin: normalizedTarget,
      sell,
      pause,
      improveTargets,
    };
  }, [averageRentabilidadMargin, marketingProducts, marketingProfile.targetMargin]);

  const hasMarketingData = marketingProducts.some((item) => item.attempts > 0 || item.revenue > 0);

  const materialTypeById = useMemo(() => {
    const map = new Map<string, string>();
    materialStock.forEach((spool) => {
      map.set(spool.id, spool.materialType || "");
    });
    return map;
  }, [materialStock]);

  const marketingMaterialVariety = useMemo(() => {
    const types = new Set<string>();
    records.forEach((record) => {
      const material =
        record.materialType || materialTypeById.get(record.selectedMaterialId ?? "") || "";
      if (material) {
        types.add(material);
      }
    });
    return types.size;
  }, [records, materialTypeById]);

  const planSignals = useMemo(() => {
    const now = Date.now();
    const windowMs = 1000 * 60 * 60 * 24 * 30;
    let recentAttempts = 0;
    let recentHours = 0;

    records.forEach((record) => {
      const parsed = parseRecordDate(record.date);
      if (!parsed) return;
      if (now - parsed.getTime() > windowMs) return;
      if (record.status !== "finalizada_ok" && record.status !== "finalizada_fallida") return;
      const quantity = typeof record.quantity === "number" && record.quantity > 0 ? record.quantity : 1;
      recentAttempts += quantity;
      const minutes = Number.isFinite(record.inputs?.timeMinutes) ? record.inputs.timeMinutes : 0;
      recentHours += (minutes / 60) * quantity;
    });

    let demandStatus = "Demanda estable";
    if (!hasMarketingData) {
      demandStatus = "Demanda sin datos";
    } else if (recentAttempts >= 20) {
      demandStatus = "Alta demanda";
    } else if (recentAttempts >= 8) {
      demandStatus = "Demanda estable";
    } else {
      demandStatus = "Baja demanda";
    }

    const capacityTarget = Number.parseFloat(marketingProfile.weeklyCapacityHours);
    const weeklyCapacity = Number.isFinite(capacityTarget) && capacityTarget > 0 ? capacityTarget : null;
    const weeklyLoad = recentHours / 4.3;
    let capacityStatus = "Capacidad sin definir";
    if (!weeklyCapacity) {
      capacityStatus = "Capacidad sin definir";
    } else if (!hasMarketingData) {
      capacityStatus = "Capacidad sin datos";
    } else if (weeklyLoad >= weeklyCapacity * 0.9) {
      capacityStatus = "Capacidad al límite";
    } else if (weeklyLoad >= weeklyCapacity * 0.6) {
      capacityStatus = "Capacidad ajustada";
    } else {
      capacityStatus = "Capacidad disponible";
    }

    let marginStatus = "Margen sin datos";
    if (!hasMarketingData) {
      marginStatus = "Margen sin datos";
    } else if (!marketingProfile.targetMargin) {
      marginStatus = "Margen sin objetivo";
    } else {
      const target = marketingRecommendations.targetMargin;
      const avg = averageRentabilidadMargin;
      if (avg >= target + 5) {
        marginStatus = "Por encima del objetivo";
      } else if (avg >= target - 5) {
        marginStatus = "Dentro del objetivo";
      } else {
        marginStatus = "Por debajo del objetivo";
      }
    }

    return { demandStatus, capacityStatus, marginStatus };
  }, [
    averageRentabilidadMargin,
    hasMarketingData,
    marketingProfile.targetMargin,
    marketingProfile.weeklyCapacityHours,
    marketingRecommendations.targetMargin,
    records,
  ]);

  const planActions = useMemo(() => {
    const actions: string[] = [];
    if (!hasMarketingData) {
      actions.push("Registrá ventas y fallos para activar recomendaciones personalizadas.");
      actions.push("Definí un margen objetivo para orientar tus precios.");
      actions.push("Cargá tu capacidad semanal para planificar entregas.");
      return actions;
    }

    if (planSignals.demandStatus === "Baja demanda") {
      actions.push("Priorizar productos de baja complejidad para mejorar rotación.");
    } else if (planSignals.demandStatus === "Alta demanda") {
      actions.push("Concentrar la producción en los productos más pedidos.");
    } else {
      actions.push("Sostener un mix equilibrado de productos con salida constante.");
    }

    if (marketingRecommendations.sell[0]) {
      actions.push(`Promover ${marketingRecommendations.sell[0].productName} esta semana.`);
    }

    if (planSignals.capacityStatus === "Capacidad al límite") {
      actions.push("Evitar pedidos multiparte grandes y cerrar fechas de entrega realistas.");
    } else if (planSignals.capacityStatus === "Capacidad disponible") {
      actions.push("Abrir ventanas de pedidos cortos para llenar capacidad libre.");
    }

    if (marketingRecommendations.pause[0]) {
      actions.push(`Pausar temporalmente ${marketingRecommendations.pause[0].productName}.`);
    }

    if (marketingRecommendations.improveTargets[0]) {
      actions.push(`Simplificar la producción de ${marketingRecommendations.improveTargets[0].productName}.`);
    }

    return actions.slice(0, 5);
  }, [hasMarketingData, marketingRecommendations, planSignals]);

  const planChecklist = useMemo(() => {
    const items: string[] = [];
    if (!hasMarketingData) {
      items.push("Definir margen objetivo y capacidad semanal.");
      items.push("Registrar al menos 3 ventas reales.");
      items.push("Documentar fallos para ajustar procesos.");
      return items;
    }

    if (marketingRecommendations.pause.length > 0) {
      items.push("Pausar productos de bajo margen.");
    }
    if (marketingRecommendations.sell.length > 0) {
      items.push("Enfocar la producción en 1 o 2 productos principales.");
    }
    if (marketingSummary.failureRate >= 12) {
      items.push("Reservar capacidad para fallos y reimpresiones.");
    }
    if (marketingMaterialVariety > 1) {
      items.push("Agrupar impresiones por material y color.");
    }
    if (planSignals.capacityStatus === "Capacidad al límite") {
      items.push("Ordenar entregas por prioridad y comunicar tiempos realistas.");
    }
    if (planSignals.demandStatus === "Baja demanda") {
      items.push("Revisar precios de productos rápidos para mejorar rotación.");
    }

    if (items.length === 0) {
      items.push("Mantener el foco en entregas actuales y revisar el plan cada semana.");
    }

    return items.slice(0, 5);
  }, [
    hasMarketingData,
    marketingMaterialVariety,
    marketingRecommendations.pause.length,
    marketingRecommendations.sell.length,
    marketingSummary.failureRate,
    planSignals.capacityStatus,
    planSignals.demandStatus,
  ]);

  const planAvoid = useMemo(() => {
    const items: string[] = [];
    if (!hasMarketingData) {
      return items;
    }
    if (planSignals.capacityStatus === "Capacidad al límite") {
      items.push("Pedidos multiparte grandes.");
    }
    if (marketingSummary.failureRate >= 15) {
      items.push("Impresiones con tolerancias críticas sin test previo.");
    }
    if (planSignals.demandStatus === "Baja demanda") {
      items.push("Nuevas líneas complejas con baja rotación.");
    }
    if (items.length === 0 && planSignals.demandStatus === "Alta demanda") {
      items.push("Cambios drásticos de catálogo esta semana.");
    }
    return items;
  }, [hasMarketingData, marketingSummary.failureRate, planSignals.capacityStatus, planSignals.demandStatus]);

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

  const handleBrandChange = <K extends keyof BrandSettings>(key: K, value: BrandSettings[K]) => {
    setBrand((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        handleBrandChange("logoDataUrl", reader.result);
      }
    };
    reader.readAsDataURL(file);
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
      case "en_produccion":
        return { label: "En producción", className: "bg-indigo-100 text-indigo-700" };
      case "finalizada_ok":
        return { label: "Finalizada OK", className: "bg-green-100 text-green-700" };
      case "finalizada_fallida":
        return { label: "Finalizada fallida", className: "bg-red-100 text-red-700" };
      default:
        return { label: "Cotizada", className: "bg-yellow-100 text-yellow-700" };
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
    if (isGrowing && !isDev() && records.length >= quoteLimit) {
      // Punto único de entrada PRO: mismo modal para límite FREE y CTA manual.
      if (access?.plan === "beta") {
        toast.info("Alcanzaste el limite de cotizaciones de la beta.", { duration: 2500 });
      } else {
        handleOpenProModal("limit");
      }
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
      marginPercent: params.profitPercent,
      profit: result.breakdown.profit,
      breakdown: {
        materiales: result.breakdown.materialCost,
        energia: result.breakdown.energyCost,
        manoDeObra: result.breakdown.laborCost,
        usoYMantenimiento: result.breakdown.wearCost + result.breakdown.operatingCost,
        finalPrice: result.breakdown.finalPrice,
      },
    };
  };

  type PdfData = {
    productName: string;
    categoryName: string;
    dateLabel: string;
    marginPercent: number;
    profit: number;
    breakdown: {
      materiales: number;
      energia: number;
      manoDeObra: number;
      usoYMantenimiento: number;
      finalPrice: number;
    };
  };

  const buildPdfDataFromRecord = (record: HistoryRecord): PdfData => ({
    productName: record.productName || record.name || "Producto",
    categoryName: record.category || "General",
    dateLabel: record.date || formatDate(new Date()),
    marginPercent: record.params.profitPercent,
    profit: record.breakdown.profit,
    breakdown: {
      materiales: record.breakdown.materialCost,
      energia: record.breakdown.energyCost,
      manoDeObra: record.breakdown.laborCost,
      usoYMantenimiento: record.breakdown.wearCost + record.breakdown.operatingCost,
      finalPrice: record.breakdown.finalPrice,
    },
  });

  const renderQuotationPdf = ({
    productName,
    categoryName,
    dateLabel,
    marginPercent,
    profit,
    breakdown,
  }: PdfData) => {
    if (!breakdown) return;

    const doc = new jsPDF();
    const pdfBrand = canBranding ? brand : DEFAULT_BRAND;
    const theme = createPdfTheme(pdfBrand);
    const pageWidth = doc.internal.pageSize.getWidth();
    const rightEdge = pageWidth - theme.marginX;
    let cursorY = renderHeader(doc, pdfBrand, theme, "Cotización de producto");

    const clientBreakdown = [
      { label: "Materiales", value: breakdown.materiales },
      { label: "Consumo energético", value: breakdown.energia },
      { label: "Mano de obra", value: breakdown.manoDeObra },
      { label: "Uso y mantenimiento de equipo", value: breakdown.usoYMantenimiento },
    ];
    const costTotal = clientBreakdown.reduce((acc, item) => acc + item.value, 0);
    const cardWidth = pageWidth - theme.marginX * 2;
    const cardPadding = 8;
    const sectionGap = 10;
    const lineHeight = theme.lineGap;
    const labelColor = { r: 100, g: 116, b: 139 };
    const mutedColor = { r: 148, g: 163, b: 184 };
    const borderColor = { r: 226, g: 232, b: 240 };
    const formattedMargin = Number.isFinite(marginPercent)
      ? new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(marginPercent)
      : "0";

    doc.setFont("helvetica", "normal");
    doc.setFontSize(theme.textSize);
    doc.setTextColor(17, 24, 39);
    doc.text(`Producto: ${productName}`, theme.marginX, cursorY);
    cursorY += theme.lineGap;
    doc.text(`Categoría: ${categoryName}`, theme.marginX, cursorY);
    cursorY += theme.lineGap;
    doc.text(`Fecha: ${dateLabel}`, theme.marginX, cursorY);
    cursorY += 8;

    const drawCard = (height: number, title: string, renderContent: (startY: number) => void) => {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
      doc.setLineWidth(0.4);
      doc.roundedRect(theme.marginX, cursorY, cardWidth, height, 4, 4, "FD");

      const titleY = cursorY + cardPadding + lineHeight;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(theme.textSize);
      doc.setTextColor(theme.accent.r, theme.accent.g, theme.accent.b);
      doc.text(title, theme.marginX + cardPadding, titleY);

      renderContent(titleY + 6);
      cursorY += height + sectionGap;
    };

    const costCardHeight =
      cardPadding * 2 +
      lineHeight +
      4 +
      clientBreakdown.length * lineHeight +
      6 +
      lineHeight +
      lineHeight;

    drawCard(costCardHeight, "Costos de producción", (startY) => {
      let contentY = startY;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(theme.textSize);
      doc.setTextColor(labelColor.r, labelColor.g, labelColor.b);
      clientBreakdown.forEach((item) => {
        doc.text(item.label, theme.marginX + cardPadding, contentY);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(17, 24, 39);
        doc.text(formatMoney(item.value), rightEdge - cardPadding, contentY, { align: "right" });
        doc.setFont("helvetica", "normal");
        doc.setTextColor(labelColor.r, labelColor.g, labelColor.b);
        contentY += lineHeight;
      });

      contentY += 2;
      doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
      doc.setLineWidth(0.3);
      doc.line(theme.marginX + cardPadding, contentY, rightEdge - cardPadding, contentY);
      contentY += lineHeight;

      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39);
      doc.text("Costo de producción", theme.marginX + cardPadding, contentY);
      doc.text(formatMoney(costTotal), rightEdge - cardPadding, contentY, { align: "right" });
      contentY += lineHeight;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(mutedColor.r, mutedColor.g, mutedColor.b);
      doc.text("Detalle incluido para transparencia de costos.", theme.marginX + cardPadding, contentY);
    });

    const strategyCardHeight = cardPadding * 2 + lineHeight + 4 + lineHeight * 2;
    drawCard(strategyCardHeight, "Estrategia de precio", (startY) => {
      let contentY = startY;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(theme.textSize);
      doc.setTextColor(labelColor.r, labelColor.g, labelColor.b);
      doc.text("Margen aplicado", theme.marginX + cardPadding, contentY);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39);
      doc.text(`${formattedMargin}%`, rightEdge - cardPadding, contentY, { align: "right" });
      contentY += lineHeight;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(labelColor.r, labelColor.g, labelColor.b);
      doc.text("Utilidad estimada", theme.marginX + cardPadding, contentY);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39);
      doc.text(formatMoney(profit), rightEdge - cardPadding, contentY, { align: "right" });
    });

    const priceCardHeight = cardPadding * 2 + lineHeight + 6 + 22 + lineHeight + 4;
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(theme.accent.r, theme.accent.g, theme.accent.b);
    doc.setLineWidth(0.6);
    doc.roundedRect(theme.marginX, cursorY, cardWidth, priceCardHeight, 5, 5, "FD");

    const priceTitleY = cursorY + cardPadding + lineHeight;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(theme.textSize);
    doc.setTextColor(theme.accent.r, theme.accent.g, theme.accent.b);
    doc.text("Precio final sugerido", theme.marginX + cardPadding, priceTitleY);

    const priceValueY = priceTitleY + 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(17, 24, 39);
    doc.text(formatMoney(breakdown.finalPrice), rightEdge - cardPadding, priceValueY, {
      align: "right",
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(mutedColor.r, mutedColor.g, mutedColor.b);
    doc.text(
      "Precio sugerido calculado en base a costos reales y margen objetivo.",
      theme.marginX + cardPadding,
      priceValueY + lineHeight,
    );
    cursorY += priceCardHeight + sectionGap;

    if (shouldWatermarkPdf) {
      const watermarkY = doc.internal.pageSize.getHeight() - 26;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text("Generado con Costly3D - Version Beta", pageWidth / 2, watermarkY, {
        align: "center",
      });
    }

    renderFooter(doc, pdfBrand, theme);

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
    const allowExport = canQuoteExport;
    attemptPdfExport(data, allowExport);
  };

  const exportRecordPdf = (record: HistoryRecord) => {
    const data = buildPdfDataFromRecord(record);
    attemptPdfExport(data, canQuoteExport);
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
      createdAt: new Date().toISOString(),
      duplicatedFrom: null,
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
      status: "cotizada",
      stockDeductedGrams: 0,
      startedAt: null,
      completedAt: null,
      reprintOfId: null,
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

  const handleExportExcel = () => {
    if (!canAdvancedExport) {
      toast.info("Las exportaciones avanzadas no están disponibles en tu plan.", { duration: 2500 });
      return;
    }
    if (monthlyReportRecords.length === 0) {
      toast.error("No hay datos para exportar el reporte.");
      return;
    }
    try {
      exportarExcel(activarBranding(reporteExportData, brand, canBranding));
    } catch (error) {
      toast.error("No pudimos generar el Excel. Intentalo de nuevo.");
    }
  };

  const handleExportPdf = async () => {
    if (!canAdvancedExport) {
      toast.info("Las exportaciones avanzadas no están disponibles en tu plan.", { duration: 2500 });
      return;
    }
    if (monthlyReportRecords.length === 0) {
      toast.error("No hay datos para exportar el reporte.");
      return;
    }
    try {
      await exportarPDF(activarBranding(reporteExportData, brand, canBranding), reportCardsRef.current);
    } catch (error) {
      toast.error("No pudimos generar el PDF. Intentalo de nuevo.");
    }
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

  function parseRecordDate(value: string) {
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
  }

  const handleParamChange = <K extends keyof PricingParams>(key: K, value: string) => {
    const numericValue = parseFloat(value);
    setParams((prev) => ({
      ...prev,
      [key]: Number.isNaN(numericValue) ? 0 : numericValue,
    }));
  };

  const handleMarketingProfileChange = <K extends keyof MarketingProfile>(key: K, value: string) => {
    setMarketingProfile((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const openConfirmModal = (record: HistoryRecord) => {
    setIsFailureModalOpen(false);
    setStockModal({ open: false, available: 0, required: 0, recordId: null, selectedMaterialId: "" });
    setConfirmTarget(record);
    setIsConfirmModalOpen(true);
  };

  const closeConfirmModal = () => {
    setIsConfirmModalOpen(false);
    setConfirmTarget(null);
  };

  const getRequiredGramsForRecord = (record: HistoryRecord) => {
    const quantity = typeof record.quantity === "number" && record.quantity > 0 ? record.quantity : 1;
    if (
      typeof record.materialGramsUsed === "number" &&
      Number.isFinite(record.materialGramsUsed) &&
      record.materialGramsUsed > 0
    ) {
      return record.materialGramsUsed;
    }
    return record.inputs.materialGrams * quantity;
  };

  const openFailureModal = (record: HistoryRecord) => {
    setStockModal({ open: false, available: 0, required: 0, recordId: null, selectedMaterialId: "" });
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

  const openFailureDetailModal = (record: HistoryRecord) => {
    setFailureDetailTarget(record);
  };

  const closeFailureDetailModal = () => {
    setFailureDetailTarget(null);
  };

  const handleConfirmProduction = () => {
    if (!confirmTarget) return;
    if (confirmTarget.status !== "cotizada") {
      closeConfirmModal();
      return;
    }
    const nextRecords = records.map((record) =>
      record.id === confirmTarget.id
        ? {
            ...record,
            status: "en_produccion" as const,
            stockDeductedGrams: 0,
            startedAt: null,
            completedAt: null,
          }
        : record,
    );
    persistHistory(nextRecords);
    closeConfirmModal();
  };

  const openStockInsufficientModal = (payload: {
    recordId: string;
    required: number;
    selectedMaterialId: string;
  }) => {
    setIsFailureModalOpen(false);
    setStockModal({
      open: true,
      available:
        materialStock.find((item) => item.id === payload.selectedMaterialId)?.gramsAvailable ?? 0,
      required: payload.required,
      recordId: payload.recordId,
      selectedMaterialId: payload.selectedMaterialId,
    });
  };

  const beginProduction = (record: HistoryRecord, overrideMaterialId?: string) => {
    if (record.status !== "en_produccion") return;
    if (record.startedAt) return;
    const selectedId = overrideMaterialId ?? record.selectedMaterialId ?? "";
    const required = getRequiredGramsForRecord(record);
    const spool = selectedId ? materialStock.find((item) => item.id === selectedId) : undefined;
    const isDemoSpool = Boolean(spool?.isDemo);
    if (!isDemoSpool) {
      const available = spool?.gramsAvailable ?? 0;
      if (!spool || required > available) {
        openStockInsufficientModal({
          recordId: record.id,
          required,
          selectedMaterialId: selectedId,
        });
        return;
      }
      const nextStock = materialStock.map((item) =>
        item.id === spool.id ? { ...item, gramsAvailable: item.gramsAvailable - required } : item,
      );
      persistMaterialStock(nextStock);
    }
    const nextRecords = records.map((item) => {
      if (item.id !== record.id) return item;
      return {
        ...item,
        startedAt: new Date().toISOString(),
        completedAt: null,
        stockDeductedGrams: isDemoSpool ? 0 : required,
        selectedMaterialId: spool?.id ?? selectedId,
        materialType: spool?.materialType ?? record.materialType ?? null,
        materialColorName: spool?.color?.name ?? record.materialColorName ?? null,
        materialBrand: spool?.brand ?? record.materialBrand ?? null,
        materialGramsUsed: required,
      };
    });
    persistHistory(nextRecords);
  };

  const finalizeProduction = (record: HistoryRecord) => {
    if (record.status !== "en_produccion") return;
    if (!record.startedAt) return;
    const nextRecords = records.map((item) =>
      item.id === record.id
        ? { ...item, status: "finalizada_ok" as const, completedAt: new Date().toISOString() }
        : item,
    );
    persistHistory(nextRecords);
  };

  const handleMarkFinalized = (record: HistoryRecord) => {
    finalizeProduction(record);
  };

  const handleConfirmFailure = () => {
    if (!failureTarget) return;
    if (failureTarget.status !== "en_produccion") {
      closeFailureModal();
      return;
    }
    if (!failureTarget.startedAt) {
      closeFailureModal();
      return;
    }
    const required = getRequiredGramsForRecord(failureTarget);
    const percent = Math.min(99, Math.max(0, failurePercent));
    const lostGrams = (required * percent) / 100;
    const lostCost = (failureTarget.breakdown.totalCost * percent) / 100;
    const gramsRecovered = Math.max(0, required - lostGrams);
    const spool = failureTarget.selectedMaterialId
      ? materialStock.find((item) => item.id === failureTarget.selectedMaterialId)
      : undefined;
    const isDemoSpool = Boolean(spool?.isDemo);
    const alreadyDeducted = Number(failureTarget.stockDeductedGrams ?? 0);
    if (!isDemoSpool && spool) {
      const available = spool.gramsAvailable ?? 0;
      const adjustment = alreadyDeducted - lostGrams;
      const nextStock = materialStock.map((item) => {
        if (item.id !== spool.id) return item;
        if (adjustment > 0) {
          return { ...item, gramsAvailable: available + adjustment };
        }
        if (adjustment < 0) {
          return { ...item, gramsAvailable: Math.max(0, available - Math.abs(adjustment)) };
        }
        return item;
      });
      persistMaterialStock(nextStock);
    }
    const failureDetails: FailureDetails = {
      date: new Date().toLocaleDateString("es-AR"),
      percentPrinted: percent,
      lostGrams,
      lostCost,
      gramsLost: lostGrams,
      gramsRecovered,
      materialCostLost: (failureTarget.breakdown.materialCost * percent) / 100,
      energyCostLost: (failureTarget.breakdown.energyCost * percent) / 100,
      reason: failureNote.trim() || undefined,
      note: failureNote.trim() || undefined,
    };
    const nextRecords = records.map((item) =>
      item.id === failureTarget.id
        ? {
            ...item,
            status: "finalizada_fallida" as const,
            failure: failureDetails,
            stockDeductedGrams: isDemoSpool ? 0 : lostGrams,
            completedAt: new Date().toISOString(),
          }
        : item,
    );
    persistHistory(nextRecords);
    closeFailureModal();
  };

  const openRecord = (record: HistoryRecord) => {
    if (record.status !== "cotizada") {
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

  const duplicateQuotation = (originalId: string) => {
    const original = records.find((record) => record.id === originalId);
    if (!original) {
      toast.error("No encontramos la cotización seleccionada.");
      return;
    }
    if (original.status === "en_produccion") {
      toast.info("No podés duplicar una cotización en producción.", { duration: 2500 });
      return;
    }
    if (!isValidInputs(original.inputs)) {
      toast.info("Esta cotización está incompleta y no se puede duplicar.", { duration: 2500 });
      return;
    }
    if (!isValidParams(params)) {
      toast.info("Revisá los parámetros actuales antes de duplicar.", { duration: 2500 });
      return;
    }
    const inputs: PricingInputs = { ...original.inputs };
    const paramsSnapshot: PricingParams = { ...params };
    const breakdown = pricingCalculator({ inputs, params: paramsSnapshot });
    if (!isValidBreakdown(breakdown)) {
      toast.info("No pudimos recalcular la cotización con los valores actuales.", { duration: 2500 });
      return;
    }
    const quantity = typeof original.quantity === "number" && original.quantity > 0 ? original.quantity : 1;
    const fallbackSpool = original.selectedMaterialId
      ? materialStock.find((item) => item.id === original.selectedMaterialId)
      : undefined;
    const materialType = original.materialType ?? fallbackSpool?.materialType ?? null;
    const materialColorName = original.materialColorName ?? fallbackSpool?.color?.name ?? null;
    const materialBrand = original.materialBrand ?? fallbackSpool?.brand ?? null;
    const duplicated: HistoryRecord = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("es-AR"),
      createdAt: new Date().toISOString(),
      duplicatedFrom: original.id,
      name: original.name,
      productName: original.productName || original.name,
      category: original.category || "General",
      inputs,
      params: paramsSnapshot,
      breakdown,
      total: breakdown.finalPrice,
      selectedMaterialId: original.selectedMaterialId ?? "",
      materialGramsUsed: inputs.materialGrams * quantity,
      materialType,
      materialColorName,
      materialBrand,
      quantity,
      status: "cotizada",
      stockDeductedGrams: 0,
      startedAt: null,
      completedAt: null,
      reprintOfId: null,
      failure: null,
      stockChanges: [],
    };
    const saved = persistHistory([duplicated, ...records], { allowDuplicateSignature: true });
    if (saved) {
      toast.success("Cotización duplicada. Se recalcularon los costos actuales.");
    }
  };

  const duplicateProduction = (record: HistoryRecord) => {
    if (record.status !== "finalizada_ok" && record.status !== "finalizada_fallida") return;
    const duplicated: HistoryRecord = {
      ...record,
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("es-AR"),
      createdAt: new Date().toISOString(),
      status: "en_produccion",
      stockDeductedGrams: 0,
      startedAt: null,
      completedAt: null,
      reprintOfId: record.id,
      failure: null,
      stockChanges: [],
      materialGramsUsed: 0,
    };
    persistHistory([duplicated, ...records], { allowDuplicateSignature: true });
    toast.success("Reimpresión creada. Ajustá y comenzá cuando quieras.");
  };

  const deleteRecord = (record: HistoryRecord) => {
    if (record.status !== "cotizada" && !isDev()) {
      toast.info("Solo podés eliminar cotizaciones en estado cotizada.", { duration: 2500 });
      return;
    }
    if (!confirm("¿Eliminar este producto del historial?")) return;
    const nextRecords = records.filter((item) => item.id !== record.id);
    persistHistory(nextRecords);
    if (editingRecordId === record.id) {
      clearFields();
    }
  };

  const revenueRecords = records.filter((record) => record.status === "finalizada_ok");
  const failedRecords = records.filter((record) => record.status === "finalizada_fallida");

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
  const monthlyReportRecords = [...monthlyRecords, ...monthlyFailedRecords].sort((a, b) => {
    const dateA = parseRecordDate(a.date)?.getTime() ?? 0;
    const dateB = parseRecordDate(b.date)?.getTime() ?? 0;
    return dateB - dateA;
  });
  const monthlyMetrics = useMemo(() => calculateMonthlyMetrics(monthlyReportRecords), [monthlyReportRecords]);
  const monthlyItemsById = useMemo(
    () => new Map(monthlyMetrics.items.map((item) => [item.id, item])),
    [monthlyMetrics.items],
  );
  const monthlyFailureLosses = monthlyMetrics.totals.perdidasFallasTotal;
  const monthlyFailureGrams = monthlyMetrics.totals.gramosDesperdiciados;
  const monthlyFailureRate = monthlyMetrics.totals.tasaFallas;
  const consumoImpresiones = useMemo(() => {
    const impresiones: ImpresionConsumoInput[] = [...monthlyRecords, ...monthlyFailedRecords].map((record) => {
      const quantity = typeof record.quantity === "number" && record.quantity > 0 ? record.quantity : 1;
      const tiempoTotal = (record.inputs.timeMinutes / 60) * quantity;
      const filamentoTotal = getRequiredGramsForRecord(record);
      const energiaTotal = record.breakdown.energyCost * quantity;
      const isFailed = record.status === "finalizada_fallida";
      const porcentajeCompletado = isFailed ? (record.failure?.percentPrinted ?? 0) / 100 : 1;
      return {
        estado: isFailed ? "fallida" : "terminada",
        tiempoTotal,
        filamentoTotal,
        energiaTotal,
        porcentajeCompletado,
      };
    });
    return calcularConsumoImpresiones(impresiones);
  }, [monthlyRecords, monthlyFailedRecords]);
  const reportHours = consumoImpresiones.tiempoTotalConsumido;
  const materialConsumptionSummary = useMemo(() => {
    const materialConsumptionByMaterial = new Map<string, number>();
    const materialConsumptionByColor = new Map<string, number>();
    const materialConsumptionByBrand = new Map<string, number>();
    const materialConsumptionByCombo = new Map<
      string,
      { material: string; color: string; brand: string; grams: number }
    >();

    monthlyReportRecords.forEach((record) => {
      const item = monthlyItemsById.get(record.id);
      const gramsUsed = item?.gramsUsed ?? 0;
      if (!Number.isFinite(gramsUsed) || gramsUsed <= 0) return;
      const snapshot = resolveMaterialSnapshotFromRecord(record);
      const materialKey = snapshot?.materialType || "Sin material";
      const colorKey = snapshot?.colorName || "Sin color";
      const brandKey = snapshot?.brandName || "Sin marca";

      materialConsumptionByMaterial.set(
        materialKey,
        (materialConsumptionByMaterial.get(materialKey) ?? 0) + gramsUsed,
      );
      materialConsumptionByColor.set(colorKey, (materialConsumptionByColor.get(colorKey) ?? 0) + gramsUsed);
      materialConsumptionByBrand.set(brandKey, (materialConsumptionByBrand.get(brandKey) ?? 0) + gramsUsed);
      const comboKey = `${materialKey}||${colorKey}||${brandKey}`;
      const combo = materialConsumptionByCombo.get(comboKey);
      if (combo) {
        combo.grams += gramsUsed;
      } else {
        materialConsumptionByCombo.set(comboKey, {
          material: materialKey,
          color: colorKey,
          brand: brandKey,
          grams: gramsUsed,
        });
      }
    });

    const materialRows = Array.from(materialConsumptionByMaterial.entries())
      .map(([material, grams]) => ({ material, grams }))
      .sort((a, b) => b.grams - a.grams);
    const comboRows = Array.from(materialConsumptionByCombo.values()).sort((a, b) => b.grams - a.grams);

    return {
      materialRows,
      comboRows,
    };
  }, [materialStock, monthlyItemsById, monthlyReportRecords]);

  const materialConsumptionRows = materialConsumptionSummary.comboRows;
  const materialConsumptionByMaterial = materialConsumptionSummary.materialRows;
  const productionRecords = records.filter(
    (record) =>
      record.status === "en_produccion" ||
      record.status === "finalizada_ok" ||
      record.status === "finalizada_fallida",
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
  const reporteMensual = useMemo(() => {
    const productos = monthlyMetrics.products
      .filter((item) => item.revenue > 0 || item.units > 0 || item.cost > 0)
      .map((item) => ({
        name: item.name,
        quantity: item.units,
        unitPrice: item.units > 0 ? item.revenue / item.units : 0,
        subtotal: item.revenue,
        costTotal: item.cost,
      }))
      .sort((a, b) => b.subtotal - a.subtotal);

    const topProductos = monthlyMetrics.products
      .filter((item) => item.revenue > 0)
      .map((item) => ({
        name: item.name,
        ingresos: item.revenue,
        unidades: item.units,
        margenPct: item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.ingresos - a.ingresos);

    const consumoChart = materialConsumptionByMaterial.slice(0, 4);
    const ingresosChart = productos.slice(0, 4);
    const topProductosChart = topProductos.slice(0, 4);

    const insights: string[] = [];
    if (monthlyMetrics.totals.perdidasFallasTotal > 0) {
      insights.push("Reducir fallos en impresiones criticas para mejorar margenes.");
    }
    if (topProductos[0]) {
      insights.push(`Potenciar el producto ${topProductos[0].name} para maximizar ingresos.`);
    }
    if (monthlyMetrics.totals.gramosConsumidos > 0 && materialConsumptionByMaterial.length > 1) {
      insights.push("Revisar consumos por material para optimizar compras y stock.");
    }
    if (insights.length === 0) {
      insights.push("Mantener consistencia en precios y registrar mas ventas para metricas mas precisas.");
    }

    return {
      ingresos: {
        total: monthlyMetrics.totals.ingresosTotal,
        productos,
        chart: {
          labels: ingresosChart.map((item) => item.name),
          values: ingresosChart.map((item) => item.subtotal),
        },
      },
      perdidas: {
        total: monthlyMetrics.totals.perdidasFallasTotal,
        filamentoDesperdiciadoGramos: monthlyMetrics.totals.gramosDesperdiciados,
        piezasFallidas: monthlyMetrics.totals.failedCount,
        costos: monthlyMetrics.totals.perdidasFallasTotal,
        chart: {
          lossPct:
            monthlyMetrics.totals.ingresosTotal > 0
              ? (monthlyMetrics.totals.perdidasFallasTotal / monthlyMetrics.totals.ingresosTotal) * 100
              : 0,
        },
      },
      consumoFilamento: {
        totalGramos: monthlyMetrics.totals.gramosConsumidos,
        porTipo: materialConsumptionByMaterial,
        chart: {
          labels: consumoChart.map((item) => item.material),
          values: consumoChart.map((item) => item.grams),
        },
      },
      topProductos: {
        items: topProductos.map((item) => ({
          name: item.name,
          ingresos: item.ingresos,
          unidades: item.unidades,
          margenPct: item.margenPct,
        })),
        chart: {
          labels: topProductosChart.map((item) => item.name),
          values: topProductosChart.map((item) => item.ingresos),
        },
      },
      rentabilidadNeta: {
        neto: monthlyMetrics.totals.rentabilidadNetaReal,
        margenPct: monthlyMetrics.totals.margenNetoRealPct,
      },
      insights,
    };
  }, [materialConsumptionByMaterial, monthlyMetrics]);
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    monthlyMetrics.items.forEach((item) => {
      const category = item.category || "General";
      map.set(category, (map.get(category) ?? 0) + item.netProfitItem);
    });
    return Array.from(map.entries()).map(([category, profit]) => ({ category, profit }));
  }, [monthlyMetrics.items]);
  const rentabilidadPositive = reporteMensual.rentabilidadNeta.neto >= 0;
  const reporteExportData = useMemo<ReporteExportData>(() => {
    const detalle = monthlyReportRecords.map((record) => {
      const snapshot = resolveMaterialSnapshotFromRecord(record);
      const item = monthlyItemsById.get(record.id);
      const priceValue = item?.revenueItem ?? 0;
      const profitValue = item?.netProfitItem ?? 0;
      const costValue = item?.costTotalItem ?? record.breakdown.totalCost;
      const gramsUsedValue = item?.gramsUsed ?? 0;
      const gramsLostValue = item?.gramsLost ?? 0;
      return {
        fecha: record.date,
        producto: record.productName || record.name || "Producto",
        categoria: record.category || "General",
        estado: record.status,
        tiempoMin: Number(record.inputs.timeMinutes.toFixed(0)),
        materialGrams: Number(record.inputs.materialGrams.toFixed(0)),
        costoTotal: Number(costValue.toFixed(0)),
        precioVenta: Number(priceValue.toFixed(0)),
        ganancia: Number(profitValue.toFixed(0)),
        material: snapshot?.materialType ?? "",
        color: snapshot?.colorName ?? "",
        marca: snapshot?.brandName ?? "",
        gramosUsados: Number(gramsUsedValue.toFixed(0)),
        gramosPerdidos: Number(gramsLostValue.toFixed(0)),
        costoMaterialPerdido: record.failure?.materialCostLost
          ? Number(record.failure.materialCostLost.toFixed(0))
          : 0,
        costoEnergiaPerdida: record.failure?.energyCostLost
          ? Number(record.failure.energyCostLost.toFixed(0))
          : 0,
        notaFallo: record.failure?.note ?? "",
      };
    });

    const consumoDetalle = materialConsumptionRows.map((row) => ({
      material: row.material,
      color: row.color,
      marca: row.brand,
      gramos: Number(row.grams.toFixed(0)),
    }));

    return {
      periodoLabel: `${reportMonthLabel} ${reportYear}`.trim(),
      periodoKey: `${reportYear}-${String(reportMonth + 1).padStart(2, "0")}`,
      ingresos: reporteMensual.ingresos,
      perdidas: reporteMensual.perdidas,
      consumoFilamento: reporteMensual.consumoFilamento,
      topProductos: reporteMensual.topProductos,
      rentabilidadNeta: reporteMensual.rentabilidadNeta,
      insights: reporteMensual.insights,
      totales: monthlyMetrics.totals,
      detalle,
      consumoDetalle,
    };
  }, [
    materialConsumptionRows,
    monthlyItemsById,
    monthlyMetrics.totals,
    monthlyReportRecords,
    reportMonth,
    reportMonthLabel,
    reportYear,
    reporteMensual,
  ]);
  const reportRecommendations = useMemo(() => {
    const base = [...reporteMensual.insights];
    if (!rentabilidadPositive) {
      base.unshift("Revisá precios o costos en los productos con menor margen.");
    }
    if (monthlyFailureRate >= 10) {
      base.unshift("Reducí fallos: calibración y chequeos antes de lotes grandes.");
    }
    if (reporteMensual.topProductos.items[0]) {
      base.push(`Concentrá esfuerzos en ${reporteMensual.topProductos.items[0].name}.`);
    }
    const unique = Array.from(new Set(base.filter(Boolean)));
    if (unique.length === 0) {
      unique.push("Mantené el plan actual y revisá el reporte la próxima semana.");
    }
    return unique.slice(0, 4);
  }, [monthlyFailureRate, rentabilidadPositive, reporteMensual]);

  const reportAlerts = useMemo(() => {
    const alerts: string[] = [];
    if (!rentabilidadPositive) {
      alerts.push("Rentabilidad neta negativa.");
    }
    if (monthlyFailureRate >= 10) {
      alerts.push("Tasa de fallas elevada.");
    }
    if (reporteMensual.perdidas.total > 0) {
      alerts.push("Pérdidas por fallas activas.");
    }
    if (alerts.length === 0) {
      alerts.push("Sin alertas críticas este mes.");
    }
    return alerts;
  }, [monthlyFailureRate, rentabilidadPositive, reporteMensual.perdidas.total]);
  const reportOpportunities = useMemo(() => {
    const opportunities: string[] = [];
    const topProduct = reporteMensual.topProductos.items[0];
    if (topProduct) {
      opportunities.push(`Escalá ${topProduct.name} si querés maximizar ingresos.`);
    }
    if (monthlyFailureRate < 5 && monthlyRecords.length > 0) {
      opportunities.push("Con fallas bajas, podés aceptar pedidos más complejos.");
    }
    if (reportHours < 20 && monthlyRecords.length > 0) {
      opportunities.push("Hay capacidad disponible para pedidos rápidos o reposiciones.");
    }
    if (opportunities.length === 0) {
      opportunities.push("Explorá nuevas variantes con bajo riesgo para mejorar el margen.");
    }
    return opportunities.slice(0, 3);
  }, [monthlyFailureRate, monthlyRecords.length, reportHours, reporteMensual]);
  useEffect(() => {
    if (!isDev()) return;
    if (monthlyMetrics.items.length === 0) return;
    const rows = monthlyMetrics.items.map((item) => ({
      status: item.status,
      revenueItem: item.revenueItem,
      costSalesItem: item.costSalesItem,
      failureCostItem: item.failureCostItem,
      netProfitItem: item.netProfitItem,
      gramsUsed: item.gramsUsed,
    }));
    rows.push({
      status: "TOTAL",
      revenueItem: monthlyMetrics.totals.ingresosTotal,
      costSalesItem: monthlyMetrics.totals.costosVentasTotal,
      failureCostItem: monthlyMetrics.totals.perdidasFallasTotal,
      netProfitItem: monthlyMetrics.totals.rentabilidadNetaReal,
      gramsUsed: monthlyMetrics.totals.gramosConsumidos,
    });
    console.table(rows);
  }, [monthlyMetrics]);
  const escenariosResumen = useMemo(() => compararEscenariosV1(scenarioInputs), [scenarioInputs]);
  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [projects, activeProjectId],
  );
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
  const ingresosChartMax = Math.max(1, ...reporteMensual.ingresos.chart.values);
  const consumoChartMax = Math.max(1, ...reporteMensual.consumoFilamento.chart.values);
  const topProductosChartMax = Math.max(1, ...reporteMensual.topProductos.chart.values);
  return (
    <div className="min-h-screen bg-app-gradient relative overflow-hidden">
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
            <div className="bg-white rounded-2xl shadow-lg p-3 space-y-4">
              {(
                [
                  {
                    title: "Operativo",
                    items: [
                      { id: "stock", label: "Stock", icon: Package },
                      { id: "calculator", label: "Costos", icon: Calculator },
                      { id: "quotations", label: "Cotizaciones", icon: FileText },
                      { id: "production", label: "Producción", icon: Factory },
                    ],
                  },
                  {
                    title: "Métricas",
                    items: [
                      { id: "reports", label: "Reportes", icon: BarChart3 },
                      { id: "profitability", label: "Rentabilidad", icon: TrendingUp },
                      ...(ENABLE_COMPARATOR
                        ? [{ id: "scenarios", label: "Comparador", icon: BarChart3 }]
                        : []),
                    ],
                  },
                  {
                    title: "Organización",
                    items: [
                      { id: "projects", label: "Proyectos", icon: FolderKanban },
                      { id: "marketing", label: "Plan de acción", icon: Target },
                    ],
                  },
                  {
                    title: "Extras",
                    items: [
                      { id: "branding", label: "Branding", icon: Palette },
                      { id: "wiki", label: "Wiki", icon: BookOpen },
                      { id: "settings", label: "Configuración", icon: Settings },
                    ],
                  },
                ] as const
              ).map((group) => (
                <div key={group.title} className="space-y-2">
                  <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {group.title}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeSection === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveSection(item.id as DashboardSection)}
                          className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                            isActive
                              ? "bg-blue-500 text-white shadow-md"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          <Icon size={18} />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>
          <main className="flex-1" data-section={activeSection}>
            {showStockBanner && (
              <div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl" aria-hidden="true">
                      <AlertTriangle size={18} />
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
                      Importante: solo cambia estos valores si varían los costos base. Los productos se cargan en la hoja
                      'Costos'.
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
                                {saveBanner.type === "success" ? (
                                  <CheckCircle size={18} />
                                ) : (
                                  <AlertTriangle size={18} />
                                )}
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
                            title={!canQuoteExport ? "Disponible en Costly3D PRO" : undefined}
                          >
                            {!canQuoteExport && (
                              <button
                                type="button"
                                className="absolute inset-0 cursor-not-allowed"
                                onClick={exportQuotationPdf}
                                aria-label="Disponible en Costly3D PRO"
                              />
                            )}
                            <button
                              type="button"
                              disabled={!canQuoteExport}
                              onClick={exportQuotationPdf}
                              className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-white px-4 py-2 text-sm font-semibold text-green-700 shadow-sm transition hover:bg-green-50 disabled:opacity-60 disabled:cursor-not-allowed"
                              title={!canQuoteExport ? "Disponible en Costly3D PRO" : undefined}
                            >
                              Exportar cotización (PDF)
                              {!canQuoteExport && (
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                                  PRO
                                </span>
                              )}
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
                                message: "Cotización guardada",
                                description: "Disponible en Cotizaciones.",
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
                <div className="relative mb-6">
                  <div
                    id="proMonthlyReport"
                    ref={reportCardsRef}
                    className={`space-y-6 ${!canAdvancedMetrics ? "blur-sm opacity-60 pointer-events-none" : ""}`}
                  >
                  <div className="bg-white rounded-3xl shadow-2xl p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-800">Reportes</h2>
                        <p className="text-sm text-gray-600">
                          Resumen ejecutivo del mes para decidir rápido qué ajustar.
                        </p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-blue-600">
                          Reportes no es para registrar, es para decidir.
                        </p>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        <p className="uppercase tracking-wide">Período</p>
                        <p className="font-semibold text-gray-700">
                          {reportMonthLabel} {reportYear}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-800">Resumen ejecutivo</h3>
                      <span className="text-xs uppercase tracking-wide text-gray-400">Qué pasó</span>
                    </div>
                    <div className="grid lg:grid-cols-3 gap-4">
                      <div
                        className={`rounded-2xl shadow-lg p-5 text-white ${
                          rentabilidadPositive
                            ? "bg-gradient-to-br from-emerald-500 to-emerald-600"
                            : "bg-gradient-to-br from-red-500 to-red-600"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <TrendingUp size={28} />
                          <span className="text-xs font-semibold uppercase tracking-wide">
                            {rentabilidadPositive ? "Positiva" : "Negativa"}
                          </span>
                        </div>
                        <p className="text-sm opacity-90">Rentabilidad neta</p>
                        <p className="mt-2 text-2xl font-bold">
                          {formatCurrency(reporteMensual.rentabilidadNeta.neto)}
                        </p>
                        <p className="mt-1 text-xs opacity-90">
                          Margen {formatPercent(reporteMensual.rentabilidadNeta.margenPct)}
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-5 text-white">
                        <div className="flex items-center justify-between mb-2">
                          <DollarSign size={28} />
                          <span className="text-xs font-semibold uppercase tracking-wide">Ingresos</span>
                        </div>
                        <p className="text-sm opacity-90">Ingresos reales</p>
                        <p className="mt-2 text-2xl font-bold">
                          {formatCurrency(reporteMensual.ingresos.total)}
                        </p>
                        <p className="mt-1 text-xs opacity-90">
                          {reporteMensual.ingresos.productos.length === 0
                            ? "Sin ventas registradas"
                            : `${reporteMensual.ingresos.productos.length} productos con ventas`}
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg p-5 text-white">
                        <div className="flex items-center justify-between mb-2">
                          <Trash2 size={28} />
                          <span className="text-xs font-semibold uppercase tracking-wide">Fallas</span>
                        </div>
                        <p className="text-sm opacity-90">Pérdidas por fallas</p>
                        <p className="mt-2 text-2xl font-bold">{formatCurrency(monthlyFailureLosses)}</p>
                        <p className="mt-1 text-xs opacity-90">
                          {monthlyFailureGrams.toFixed(0)} g desperdiciados
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl shadow-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">Explicación operativa</h3>
                      <span className="text-xs uppercase tracking-wide text-gray-400">Por qué pasó</span>
                    </div>
                    <div className="grid lg:grid-cols-4 gap-4">
                      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Consumo de filamento</p>
                        <p className="mt-2 text-lg font-semibold text-slate-800">
                          {reporteMensual.consumoFilamento.totalGramos.toFixed(0)} g
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {reporteMensual.consumoFilamento.porTipo[0]?.material
                            ? `Material dominante: ${reporteMensual.consumoFilamento.porTipo[0].material}`
                            : "Sin consumo registrado"}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Horas de impresión</p>
                        <p className="mt-2 text-lg font-semibold text-slate-800">{reportHours.toFixed(1)} h</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {monthlyRecords.length === 0 ? "Sin impresiones registradas" : "Tiempo total del mes"}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Tasa de fallas</p>
                        <p className="mt-2 text-lg font-semibold text-slate-800">{formatPercent(monthlyFailureRate)}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {monthlyFailureRate >= 10 ? "Necesita atención" : "Dentro de lo esperado"}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Top productos</p>
                        <div className="mt-2 space-y-2 text-sm text-slate-700">
                          {reporteMensual.topProductos.items.length === 0 ? (
                            <p className="text-xs text-slate-500">Sin productos destacados</p>
                          ) : (
                            reporteMensual.topProductos.items.slice(0, 3).map((item) => (
                              <div key={item.name} className="flex items-center justify-between">
                                <span className="truncate">{item.name}</span>
                                <span className="text-xs text-slate-500">{item.unidades} uds</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl shadow-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">Dirección futura</h3>
                      <span className="text-xs uppercase tracking-wide text-gray-400">Qué hacer ahora</span>
                    </div>
                    <div className="grid lg:grid-cols-3 gap-4">
                      <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4 text-emerald-800">
                        <p className="text-xs uppercase tracking-wide text-emerald-600">
                          Recomendaciones automáticas
                        </p>
                        <div className="mt-3 space-y-2 text-sm">
                          {reportRecommendations.map((item, index) => (
                            <p key={`${item}-${index}`}>• {item}</p>
                          ))}
                        </div>
                      </div>
                      <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4 text-amber-800">
                        <p className="text-xs uppercase tracking-wide text-amber-600">Alertas suaves</p>
                        <div className="mt-3 space-y-2 text-sm">
                          {reportAlerts.map((item, index) => (
                            <p key={`${item}-${index}`}>• {item}</p>
                          ))}
                        </div>
                      </div>
                      <div className="bg-sky-50 rounded-2xl border border-sky-100 p-4 text-sky-800">
                        <p className="text-xs uppercase tracking-wide text-sky-600">Oportunidades de mejora</p>
                        <div className="mt-3 space-y-2 text-sm">
                          {reportOpportunities.map((item, index) => (
                            <p key={`${item}-${index}`}>• {item}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <details className="text-sm text-gray-600">
                    <summary className="cursor-pointer font-semibold text-gray-500">
                      Detalles y gráficos (opcional)
                    </summary>
                    <div className="mt-4 space-y-6">
                      {categoryData.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white rounded-3xl shadow-2xl p-8"
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
                                contentStyle={{
                                  borderRadius: "8px",
                                  border: "none",
                                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                                }}
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

                      <div className="bg-white rounded-3xl shadow-2xl p-8 relative">
                        {canBranding && (
                          <div
                            className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b"
                            style={{ borderColor: brand.primaryColor || "#E5E7EB" }}
                          >
                            <div className="flex items-center gap-3">
                              {brand.logoDataUrl ? (
                                <img
                                  src={brand.logoDataUrl}
                                  alt={brand.name || "Logo"}
                                  className="h-10 w-10 rounded-lg object-contain bg-white"
                                />
                              ) : (
                                <div
                                  className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
                                  style={{ backgroundColor: brand.primaryColor || "#5b9dff" }}
                                >
                                  {brand.name?.trim().charAt(0) || "C"}
                                </div>
                              )}
                              <div>
                                <p className="text-xs uppercase tracking-wide text-gray-400">Marca</p>
                                <p className="text-lg font-semibold text-gray-800">{brand.name || "Costly3D"}</p>
                              </div>
                            </div>
                            <div className="text-right text-xs text-gray-500">
                              <p className="uppercase tracking-wide">Reporte mensual</p>
                              <p className="font-semibold text-gray-700">
                                {reportMonthLabel} {reportYear}
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-800">Reporte mensual de rentabilidad</h2>
                            <p className="text-sm text-gray-600">
                              Metrica profesional del mes con ingresos, fallos y consumo de filamento.
                            </p>
                          </div>
                          <span className="bg-purple-100 text-purple-600 text-xs font-semibold px-3 py-1 rounded-full">
                            PRO
                          </span>
                        </div>

                        <div
                          className={`mt-6 grid md:grid-cols-3 gap-4 ${
                            canAdvancedMetrics ? "" : "blur-sm opacity-60 pointer-events-none"
                          }`}
                        >
                          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-5 text-white">
                            <div className="flex items-center justify-between">
                              <DollarSign size={24} />
                              <span className="text-2xl font-bold">
                                {canAdvancedMetrics ? formatCurrency(reporteMensual.ingresos.total) : "—"}
                              </span>
                            </div>
                            <p className="mt-1 text-sm opacity-90">Ingresos reales</p>
                            <div className="mt-3 space-y-2 text-xs">
                              {reporteMensual.ingresos.productos.length === 0 ? (
                                <p className="opacity-80">Sin ventas registradas este mes.</p>
                              ) : (
                                reporteMensual.ingresos.productos.slice(0, 3).map((item) => (
                                  <div key={item.name} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="truncate">{item.name}</span>
                                      <span className="font-semibold">{formatCurrency(item.subtotal)}</span>
                                    </div>
                                    <p className="text-[11px] opacity-80">
                                      {item.quantity} x {formatCurrency(item.unitPrice)}
                                    </p>
                                  </div>
                                ))
                              )}
                            </div>
                            <div className="mt-3 space-y-1">
                              {reporteMensual.ingresos.chart.values.length === 0 ? (
                                <p className="text-[11px] opacity-80">Sin datos para barras.</p>
                              ) : (
                                reporteMensual.ingresos.chart.values.map((value, index) => {
                                  const label = reporteMensual.ingresos.chart.labels[index] ?? "Producto";
                                  const width = Math.min(100, (value / ingresosChartMax) * 100);
                                  return (
                                    <div key={`${label}-${index}`} className="flex items-center gap-2 text-[10px]">
                                      <span className="w-16 truncate">{label}</span>
                                      <div className="flex-1 h-1.5 rounded-full bg-white/20">
                                        <div
                                          className="h-1.5 rounded-full bg-white/80"
                                          style={{ width: `${width}%` }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg p-5 text-white">
                            <div className="flex items-center justify-between">
                              <Trash2 size={24} />
                              <span className="text-2xl font-bold">
                                {canAdvancedMetrics ? formatCurrency(reporteMensual.perdidas.total) : "—"}
                              </span>
                            </div>
                            <p className="mt-1 text-sm opacity-90">Perdidas por fallos</p>
                            <div className="mt-3 flex items-center justify-between gap-4 text-xs">
                              <div className="space-y-1">
                                <p>
                                  Filamento perdido: {reporteMensual.perdidas.filamentoDesperdiciadoGramos.toFixed(0)} g
                                </p>
                                <p>Piezas fallidas: {reporteMensual.perdidas.piezasFallidas}</p>
                                <p>Costos asociados: {formatCurrency(reporteMensual.perdidas.costos)}</p>
                              </div>
                              <div
                                className="h-12 w-12 rounded-full"
                                style={{
                                  background: `conic-gradient(rgba(255,255,255,0.95) ${reporteMensual.perdidas.chart.lossPct}%, rgba(255,255,255,0.2) 0)`,
                                }}
                                aria-label="Porcentaje de perdidas"
                              />
                            </div>
                          </div>

                          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-5 text-white">
                            <div className="flex items-center justify-between">
                              <Package size={24} />
                              <span className="text-2xl font-bold">
                                {canAdvancedMetrics
                                  ? `${reporteMensual.consumoFilamento.totalGramos.toFixed(0)} g`
                                  : "—"}
                              </span>
                            </div>
                            <p className="mt-1 text-sm opacity-90">Consumo de filamento</p>
                            <div className="mt-3 space-y-1 text-xs">
                              <p className="opacity-90">
                                Horas impresas: {consumoImpresiones.tiempoTotalConsumido.toFixed(1)} h
                              </p>
                              <p className="opacity-90">
                                Energia estimada: {formatCurrency(consumoImpresiones.energiaTotalConsumida)}
                              </p>
                              {reporteMensual.consumoFilamento.porTipo.length === 0 ? (
                                <p className="opacity-80">Sin consumo registrado este mes.</p>
                              ) : (
                                reporteMensual.consumoFilamento.porTipo.slice(0, 3).map((item) => (
                                  <div key={item.material} className="flex items-center justify-between">
                                    <span>{item.material}</span>
                                    <span className="font-semibold">{item.grams.toFixed(0)} g</span>
                                  </div>
                                ))
                              )}
                            </div>
                            <div className="mt-3 space-y-1">
                              {reporteMensual.consumoFilamento.chart.values.length === 0 ? (
                                <p className="text-[11px] opacity-80">Sin datos para barras.</p>
                              ) : (
                                reporteMensual.consumoFilamento.chart.values.map((value, index) => {
                                  const label = reporteMensual.consumoFilamento.chart.labels[index] ?? "Material";
                                  const width = Math.min(100, (value / consumoChartMax) * 100);
                                  return (
                                    <div key={`${label}-${index}`} className="flex items-center gap-2 text-[10px]">
                                      <span className="w-16 truncate">{label}</span>
                                      <div className="flex-1 h-1.5 rounded-full bg-white/20">
                                        <div
                                          className="h-1.5 rounded-full bg-white/80"
                                          style={{ width: `${width}%` }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          <div className="bg-gradient-to-br from-emerald-500 to-blue-500 rounded-2xl shadow-lg p-5 text-white">
                            <div className="flex items-center justify-between">
                              <Sparkles size={24} />
                              <span className="text-2xl font-bold">
                                {canAdvancedMetrics ? reporteMensual.topProductos.items.length : "—"}
                              </span>
                            </div>
                            <p className="mt-1 text-sm opacity-90">Top productos</p>
                            <div className="mt-3 space-y-2 text-xs">
                              {reporteMensual.topProductos.items.length === 0 ? (
                                <p className="opacity-80">Sin productos destacados este mes.</p>
                              ) : (
                                reporteMensual.topProductos.items.slice(0, 3).map((item) => (
                                  <div key={item.name} className="flex items-center justify-between">
                                    <div>
                                      <p className="font-semibold">{item.name}</p>
                                      <p className="text-[11px] opacity-80">
                                        {item.unidades} uds · {item.margenPct.toFixed(1)}% margen
                                      </p>
                                    </div>
                                    <span className="font-semibold">{formatCurrency(item.ingresos)}</span>
                                  </div>
                                ))
                              )}
                            </div>
                            <div className="mt-3 space-y-1">
                              {reporteMensual.topProductos.chart.values.length === 0 ? (
                                <p className="text-[11px] opacity-80">Sin datos para barras.</p>
                              ) : (
                                reporteMensual.topProductos.chart.values.map((value, index) => {
                                  const label = reporteMensual.topProductos.chart.labels[index] ?? "Producto";
                                  const width = Math.min(100, (value / topProductosChartMax) * 100);
                                  return (
                                    <div key={`${label}-${index}`} className="flex items-center gap-2 text-[10px]">
                                      <span className="w-16 truncate">{label}</span>
                                      <div className="flex-1 h-1.5 rounded-full bg-white/20">
                                        <div
                                          className="h-1.5 rounded-full bg-white/80"
                                          style={{ width: `${width}%` }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          <div
                            className={`rounded-2xl shadow-lg p-5 text-white ${
                              rentabilidadPositive
                                ? "bg-gradient-to-br from-emerald-500 to-emerald-600"
                                : "bg-gradient-to-br from-red-500 to-red-600"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <TrendingUp size={24} />
                              <span className="text-2xl font-bold">
                                {canAdvancedMetrics ? formatCurrency(reporteMensual.rentabilidadNeta.neto) : "—"}
                              </span>
                            </div>
                            <p className="mt-1 text-sm opacity-90">Rentabilidad neta</p>
                            <p className="mt-3 text-sm">
                              Margen neto:{" "}
                              <span className="font-semibold">
                                {reporteMensual.rentabilidadNeta.margenPct.toFixed(1)}%
                              </span>
                            </p>
                            <div className="mt-3 h-2 rounded-full bg-white/20">
                              <div
                                className="h-2 rounded-full bg-white/80"
                                style={{
                                  width: `${Math.min(100, Math.abs(reporteMensual.rentabilidadNeta.margenPct))}%`,
                                }}
                              />
                            </div>
                          </div>

                          <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl shadow-lg p-5 text-white">
                            <div className="flex items-center justify-between">
                              <Target size={24} />
                              <span className="text-sm font-semibold">Insights</span>
                            </div>
                            <p className="mt-1 text-sm opacity-90">Recomendaciones</p>
                            <div className="mt-3 space-y-2 text-xs">
                              {reporteMensual.insights.map((item, index) => (
                                <p key={`${item}-${index}`}>• {item}</p>
                              ))}
                            </div>
                          </div>
                        </div>

                        {!canAdvancedMetrics && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-white/70">
                            <div className="text-center px-6">
                              <p className="text-sm text-gray-600 mb-4">
                                Desbloquea el reporte mensual con Costly3D PRO.
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
                    </div>
                  </details>
                  </div>

                  {!canAdvancedMetrics && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-white/70">
                      <div className="text-center px-6">
                        <p className="text-sm text-gray-600 mb-4">
                          Desbloqueá Métricas PRO para acceder a reportes y rentabilidad en un solo lugar.
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
                        id="btnExportPDF"
                        onClick={handleExportPdf}
                        disabled={!canAdvancedExport || monthlyReportRecords.length === 0}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                      >
                        <Download size={18} />
                        Reporte mensual
                      </button>
                    </div>
                    <button
                      id="btnExportExcel"
                      onClick={handleExportExcel}
                      disabled={!canAdvancedExport || monthlyReportRecords.length === 0}
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
                        {tableRecords.map((record, index) => {
                          const reportItem = isReportView ? monthlyItemsById.get(record.id) : null;
                          const costValue = isReportView && reportItem ? reportItem.costTotalItem : record.breakdown.totalCost;
                          const priceValue =
                            isReportView && reportItem
                              ? reportItem.revenueItem
                              : record.status === "finalizada_fallida"
                                ? 0
                                : record.breakdown.finalPrice;
                          const profitValue =
                            isReportView && reportItem
                              ? reportItem.netProfitItem
                              : record.status === "finalizada_fallida"
                                ? 0
                                : record.breakdown.profit;
                          const profitClass =
                            isReportView && reportItem && reportItem.netProfitItem < 0
                              ? "text-red-600"
                              : "text-green-600";

                          return (
                            <motion.tr
                            key={record.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={(event) => {
                              if (activeSection !== "quotations") return;
                              // Historial shortcut: Alt + click = duplicar cotización.
                              if (event.altKey) {
                                duplicateQuotation(record.id);
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
                              {formatCurrency(costValue)}
                            </td>
                            <td className="py-4 px-4 text-right text-green-600 font-bold">
                              {formatCurrency(priceValue)}
                            </td>
                            <td className={`py-4 px-4 text-right font-semibold ${profitClass}`}>
                              {formatCurrency(profitValue)}
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
                                {activeSection === "quotations" && (
                                  <div
                                    className="relative inline-flex"
                                    title={!canQuoteExport ? "Disponible en Costly3D PRO" : undefined}
                                  >
                                    {!canQuoteExport && (
                                      <button
                                        type="button"
                                        className="absolute inset-0 cursor-not-allowed"
                                        onClick={(event) => event.stopPropagation()}
                                        aria-label="Disponible en Costly3D PRO"
                                      />
                                    )}
                                    <button
                                      type="button"
                                      disabled={!canQuoteExport}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        if (!canQuoteExport) return;
                                        exportRecordPdf(record);
                                      }}
                                      className="inline-flex items-center justify-center gap-1 rounded-full border border-purple-200 px-2 py-1 text-xs font-semibold text-purple-600 hover:bg-purple-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                      title={!canQuoteExport ? "Disponible en Costly3D PRO" : undefined}
                                    >
                                      {canQuoteExport ? (
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
                                )}
                                {!isReportView &&
                                  activeSection === "quotations" &&
                                  (record.status === "cotizada" ||
                                    record.status === "finalizada_ok" ||
                                    record.status === "finalizada_fallida") && (
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        duplicateQuotation(record.id);
                                      }}
                                      className="inline-flex items-center justify-center rounded-full p-2 text-blue-600 hover:bg-blue-50 transition-colors"
                                      aria-label="Duplicar cotización"
                                      title="Duplicar cotización"
                                    >
                                      <Copy size={18} />
                                    </button>
                                  )}
                                {!isReportView && record.status === "cotizada" && (
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
                                      <Pencil size={18} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        openConfirmModal(record);
                                      }}
                                      className="inline-flex items-center justify-center rounded-full p-2 text-green-600 hover:bg-green-50 transition-colors"
                                      aria-label="Pasar a producción"
                                      title="Pasar a producción"
                                    >
                                      <ArrowRightCircle size={18} />
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
                                {!isReportView && activeSection === "production" && record.status === "en_produccion" && (
                                  <>
                                    {!record.startedAt ? (
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          beginProduction(record);
                                        }}
                                        className="inline-flex items-center justify-center rounded-full p-2 text-blue-600 hover:bg-blue-50 transition-colors"
                                        aria-label="Empezar producción"
                                        title="Empezar producción"
                                      >
                                        <Play size={18} />
                                      </button>
                                    ) : (
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
                                          <CheckCircle size={18} />
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
                                          <XCircle size={18} />
                                        </button>
                                      </>
                                    )}
                                  </>
                                )}
                                {!isReportView &&
                                  activeSection === "production" &&
                                  (record.status === "finalizada_ok" || record.status === "finalizada_fallida") && (
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        duplicateProduction(record);
                                      }}
                                      className="inline-flex items-center justify-center rounded-full p-2 text-blue-600 hover:bg-blue-50 transition-colors"
                                      aria-label="Duplicar impresión"
                                      title="Duplicar impresión"
                                    >
                                      <Copy size={18} />
                                    </button>
                                  )}
                                {!isReportView &&
                                  activeSection === "production" &&
                                  record.status === "finalizada_fallida" && (
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        openFailureDetailModal(record);
                                      }}
                                      className="inline-flex items-center justify-center gap-1 rounded-full border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-600 hover:bg-amber-50 transition-colors"
                                      title="Ver detalle de falla (PRO)"
                                      aria-label="Ver detalle de falla (PRO)"
                                    >
                                      {canAdvancedMetrics ? <AlertTriangle size={14} /> : <Lock size={14} />}
                                      Falla
                                    </button>
                                  )}
                                {isReportView && record.status === "finalizada_fallida" && (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openFailureDetailModal(record);
                                    }}
                                    className="inline-flex items-center justify-center gap-1 rounded-full border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-600 hover:bg-amber-50 transition-colors"
                                    title="Ver detalle de falla (PRO)"
                                    aria-label="Ver detalle de falla (PRO)"
                                  >
                                    {canAdvancedMetrics ? <AlertTriangle size={14} /> : <Lock size={14} />}
                                    Falla
                                  </button>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {ENABLE_COMPARATOR && activeSection === "scenarios" && (
          <section className="max-w-6xl mx-auto mt-10">
            <div className="bg-white rounded-3xl shadow-2xl p-8">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Comparador de escenarios (v1)</h2>
                  <p className="text-sm text-gray-600">
                    Simulá escenarios sin afectar producción real, stock ni reportes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addScenario}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all font-semibold"
                >
                  Agregar escenario
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200 text-left">
                      <th className="py-3 px-3 font-semibold text-gray-700">Nombre</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Cantidad</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Precio unit.</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Costo material/g</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">g por impresión</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Costo energía</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">% fallos</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">% impreso</th>
                      <th className="py-3 px-3 font-semibold text-gray-700 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenarioInputs.map((scenario) => (
                      <tr key={scenario.id} className="border-b border-gray-100">
                        <td className="py-3 px-3">
                          <input
                            value={scenario.nombre}
                            onChange={(event) => updateScenarioField(scenario.id, "nombre", event.target.value)}
                            className="w-40 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            value={scenario.cantidadImpresiones}
                            onChange={(event) =>
                              updateScenarioField(scenario.id, "cantidadImpresiones", event.target.value)
                            }
                            className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            value={scenario.precioUnitario}
                            onChange={(event) => updateScenarioField(scenario.id, "precioUnitario", event.target.value)}
                            className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            value={scenario.costoMaterialPorGramo}
                            onChange={(event) =>
                              updateScenarioField(scenario.id, "costoMaterialPorGramo", event.target.value)
                            }
                            className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            value={scenario.gramosPorImpresion}
                            onChange={(event) =>
                              updateScenarioField(scenario.id, "gramosPorImpresion", event.target.value)
                            }
                            className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            value={scenario.costoEnergiaPorImpresion}
                            onChange={(event) =>
                              updateScenarioField(scenario.id, "costoEnergiaPorImpresion", event.target.value)
                            }
                            className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            value={scenario.porcentajeFallos}
                            onChange={(event) => updateScenarioField(scenario.id, "porcentajeFallos", event.target.value)}
                            className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            value={scenario.porcentajeImpresoFallida}
                            onChange={(event) =>
                              updateScenarioField(scenario.id, "porcentajeImpresoFallida", event.target.value)
                            }
                            className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeScenario(scenario.id)}
                            className="text-red-500 hover:text-red-600 font-semibold text-xs"
                            disabled={scenarioInputs.length <= 2}
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Resultados comparativos</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-200 text-left">
                        <th className="py-3 px-3 font-semibold text-gray-700">Escenario</th>
                        <th className="py-3 px-3 font-semibold text-gray-700">OK</th>
                        <th className="py-3 px-3 font-semibold text-gray-700">Fallidas</th>
                        <th className="py-3 px-3 font-semibold text-gray-700">Material usado (g)</th>
                        <th className="py-3 px-3 font-semibold text-gray-700">Material perdido (g)</th>
                        <th className="py-3 px-3 font-semibold text-gray-700">Costos totales</th>
                        <th className="py-3 px-3 font-semibold text-gray-700">Ingresos</th>
                        <th className="py-3 px-3 font-semibold text-gray-700">Ganancia neta</th>
                        <th className="py-3 px-3 font-semibold text-gray-700">Margen %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {escenariosResumen.escenarios.map((scenario) => {
                        const isBestGain = scenario.id === escenariosResumen.mejorGananciaId;
                        const isBestMargin = scenario.id === escenariosResumen.mejorMargenId;
                        return (
                          <tr
                            key={scenario.id}
                            className={`border-b border-gray-100 ${isBestGain ? "bg-green-50" : ""}`}
                          >
                            <td className="py-3 px-3 font-semibold text-gray-800">
                              <div className="flex flex-wrap items-center gap-2">
                                <span>{scenario.nombre}</span>
                                {isBestGain && (
                                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                                    Mejor ganancia
                                  </span>
                                )}
                                {isBestMargin && (
                                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                    Mejor margen
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-gray-700">{scenario.impresionesOk.toFixed(1)}</td>
                            <td className="py-3 px-3 text-gray-700">{scenario.impresionesFallidas.toFixed(1)}</td>
                            <td className="py-3 px-3 text-gray-700">{scenario.materialTotalUsado.toFixed(1)}</td>
                            <td className="py-3 px-3 text-gray-700">{scenario.materialPerdido.toFixed(1)}</td>
                            <td className="py-3 px-3 text-gray-800 font-semibold">
                              {formatCurrency(scenario.costoTotal)}
                            </td>
                            <td className="py-3 px-3 text-gray-800 font-semibold">
                              {formatCurrency(scenario.ingresosTotales)}
                            </td>
                            <td className="py-3 px-3 text-emerald-600 font-semibold">
                              {formatCurrency(scenario.gananciaNeta)}
                            </td>
                            <td className="py-3 px-3 text-gray-700">{scenario.margen.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        )}

                {activeSection === "projects" && (
          <section className="max-w-7xl mx-auto mt-10">
            <div className="bg-white rounded-3xl shadow-2xl p-8 relative">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Proyectos</h2>
                  <p className="text-sm text-gray-600">
                    Gestioná impresiones multiparte como una carpeta de producción.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-gray-200 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Nueva carpeta de producción</p>
                      <p className="text-xs text-gray-500">Solo nombre, categoría y descripción.</p>
                    </div>
                  </div>
                  <div className="mt-4 grid md:grid-cols-[1.2fr_0.9fr_1.6fr_auto] gap-3 items-end">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2">Nombre del proyecto</label>
                      <input
                        value={newProjectDraft.name}
                        onChange={(event) =>
                          setNewProjectDraft((prev) => ({ ...prev, name: event.target.value }))
                        }
                        placeholder="Ej: Pedido abril"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2">Categoría</label>
                      <input
                        value={newProjectDraft.category}
                        onChange={(event) =>
                          setNewProjectDraft((prev) => ({ ...prev, category: event.target.value }))
                        }
                        placeholder="General"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2">
                        Descripción (opcional)
                      </label>
                      <input
                        value={newProjectDraft.description}
                        onChange={(event) =>
                          setNewProjectDraft((prev) => ({ ...prev, description: event.target.value }))
                        }
                        placeholder="Ej: Entrega multiparte para cliente X"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateProject}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all font-semibold"
                      disabled={!isProEnabled}
                    >
                      Crear proyecto
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Carpetas de producción
                      </p>
                      <p className="text-xs text-gray-500">Seleccioná una carpeta para editar.</p>
                    </div>
                    <span className="text-xs text-gray-500">{projects.length} proyectos</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {projects.length === 0 && (
                      <p className="text-sm text-gray-500">No hay proyectos aún.</p>
                    )}
                    {projects.map((project) => {
                      const totals = calculateProjectTotals(project);
                      const isActive = activeProjectId === project.id;
                      return (
                        <button
                          key={project.id}
                          type="button"
                          onClick={() => setActiveProjectId(project.id)}
                          className={`min-w-[200px] flex-1 rounded-xl border px-3 py-3 text-left transition ${
                            isActive ? "border-blue-200 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{project.name}</p>
                              <p className="text-xs text-gray-500">{project.category || "General"}</p>
                            </div>
                            {isActive && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                Activo
                              </span>
                            )}
                          </div>
                          <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-2">
                            <span>{totals.pieces} piezas</span>
                            <span>• {totals.grams.toFixed(0)} g</span>
                            <span>• {totals.time.toFixed(1)} h</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-5 bg-slate-50">
                  {!activeProject ? (
                    <p className="text-sm text-gray-500">Seleccioná un proyecto para ver los detalles.</p>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex-1 grid lg:grid-cols-[1.1fr_0.8fr_1.5fr] gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-2">
                              Nombre del proyecto
                            </label>
                            <input
                              value={activeProject.name}
                              onChange={(event) => updateProject(activeProject.id, { name: event.target.value })}
                              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-2">Categoría</label>
                            <input
                              value={activeProject.category}
                              onChange={(event) =>
                                updateProject(activeProject.id, { category: event.target.value })
                              }
                              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-2">
                              Descripción (opcional)
                            </label>
                            <input
                              value={activeProject.description ?? ""}
                              onChange={(event) =>
                                updateProject(activeProject.id, { description: event.target.value })
                              }
                              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm"
                            />
                          </div>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-white p-4 min-w-[220px]">
                          <p className="text-xs uppercase tracking-wide text-gray-500">Totales del proyecto</p>
                          {(() => {
                            const totals = calculateProjectTotals(activeProject);
                            return (
                              <div className="mt-3 grid gap-2 text-sm text-gray-700">
                                <div className="flex items-center justify-between">
                                  <span>Total de piezas</span>
                                  <span className="font-semibold">{totals.pieces}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Total de gramos</span>
                                  <span className="font-semibold">{totals.grams.toFixed(0)} g</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Total de horas</span>
                                  <span className="font-semibold">{totals.time.toFixed(1)} h</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-700">Tabla principal</h3>
                          <p className="text-xs text-gray-500">Editá directamente como una planilla.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => addProjectPiece(activeProject.id)}
                          className="text-blue-600 font-semibold text-sm hover:text-blue-700"
                        >
                          Agregar fila
                        </button>
                      </div>

                      <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-2 overflow-x-auto lg:overflow-x-visible">
                        <table className="w-full table-fixed text-sm">
                          <colgroup>
                            <col style={{ width: "18%" }} />
                            <col style={{ width: "8%" }} />
                            <col style={{ width: "14%" }} />
                            <col style={{ width: "6%" }} />
                            <col style={{ width: "8%" }} />
                            <col style={{ width: "8%" }} />
                            <col style={{ width: "8%" }} />
                            <col style={{ width: "8%" }} />
                            <col style={{ width: "6%" }} />
                            <col style={{ width: "10%" }} />
                            <col style={{ width: "6%" }} />
                          </colgroup>
                          <thead>
                            <tr className="border-b border-gray-200 text-left">
                              <th className="py-2 px-2 text-xs font-semibold text-gray-600">Nombre de la pieza</th>
                              <th className="py-2 px-2 text-xs font-semibold text-gray-600">Color</th>
                              <th className="py-2 px-2 text-xs font-semibold text-gray-600">Material</th>
                              <th className="py-2 px-2 text-xs font-semibold text-gray-600">Cantidad</th>
                              <th className="py-2 px-2 text-xs font-semibold text-gray-600">Gramos por unidad</th>
                              <th className="py-2 px-2 text-xs font-semibold text-gray-600 text-right">
                                Gramos totales
                              </th>
                              <th className="py-2 px-2 text-xs font-semibold text-gray-600">Horas por unidad</th>
                              <th className="py-2 px-2 text-xs font-semibold text-gray-600 text-right">
                                Horas totales
                              </th>
                              <th className="py-2 px-2 text-xs font-semibold text-gray-600">Placa</th>
                              <th className="py-2 px-2 text-xs font-semibold text-gray-600">Estado</th>
                              <th className="py-2 px-2 text-xs font-semibold text-gray-600 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeProject.pieces.length === 0 ? (
                              <tr>
                                <td colSpan={11} className="py-4 text-sm text-gray-500">
                                  Agregá filas para construir tu plan de producción.
                                </td>
                              </tr>
                            ) : (
                              activeProject.pieces.map((piece) => {
                                const quantity = Number.isFinite(piece.quantity) ? piece.quantity : 0;
                                const gramsUnit = Number.isFinite(piece.grams) ? piece.grams : 0;
                                const hoursUnit = Number.isFinite(piece.estimatedTime) ? piece.estimatedTime : 0;
                                const gramsTotal = gramsUnit * quantity;
                                const hoursTotal = hoursUnit * quantity;
                                return (
                                  <tr key={piece.id} className="border-b border-gray-100">
                                    <td className="py-2 px-2">
                                      <input
                                        value={piece.partName}
                                        onChange={(event) =>
                                          updateProjectPiece(activeProject.id, piece.id, {
                                            partName: event.target.value,
                                          })
                                        }
                                        placeholder="Pieza"
                                        className="w-full min-w-0 rounded-lg border border-gray-200 px-2 py-1 text-xs"
                                      />
                                    </td>
                                    <td className="py-2 px-2">
                                      <input
                                        value={piece.color}
                                        onChange={(event) =>
                                          updateProjectPiece(activeProject.id, piece.id, { color: event.target.value })
                                        }
                                        placeholder="Color"
                                        className="w-full min-w-0 rounded-lg border border-gray-200 px-2 py-1 text-xs"
                                      />
                                    </td>
                                    <td className="py-2 px-2">
                                      <select
                                        value={piece.materialId}
                                        onChange={(event) =>
                                          updateProjectPiece(activeProject.id, piece.id, {
                                            materialId: event.target.value,
                                          })
                                        }
                                        className="w-full min-w-0 rounded-lg border border-gray-200 px-2 py-1 text-xs bg-white"
                                      >
                                        <option value="">Seleccionar</option>
                                        {materialStock.map((spool) => (
                                          <option key={spool.id} value={spool.id}>
                                            {spool.displayName}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="py-2 px-2">
                                      <input
                                        type="number"
                                        min="0"
                                        value={piece.quantity}
                                        onChange={(event) =>
                                          updateProjectPiece(activeProject.id, piece.id, {
                                            quantity: Number(event.target.value),
                                          })
                                        }
                                        className="w-full min-w-0 rounded-lg border border-gray-200 px-2 py-1 text-xs"
                                      />
                                    </td>
                                    <td className="py-2 px-2">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={piece.grams}
                                        onChange={(event) =>
                                          updateProjectPiece(activeProject.id, piece.id, {
                                            grams: Number(event.target.value),
                                          })
                                        }
                                        className="w-full min-w-0 rounded-lg border border-gray-200 px-2 py-1 text-xs"
                                      />
                                    </td>
                                    <td className="py-2 px-2 text-right text-gray-700 font-semibold whitespace-nowrap">
                                      {gramsTotal.toFixed(1)} g
                                    </td>
                                    <td className="py-2 px-2">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={piece.estimatedTime}
                                        onChange={(event) =>
                                          updateProjectPiece(activeProject.id, piece.id, {
                                            estimatedTime: Number(event.target.value),
                                          })
                                        }
                                        className="w-full min-w-0 rounded-lg border border-gray-200 px-2 py-1 text-xs"
                                      />
                                    </td>
                                    <td className="py-2 px-2 text-right text-gray-700 font-semibold whitespace-nowrap">
                                      {hoursTotal.toFixed(1)} h
                                    </td>
                                    <td className="py-2 px-2">
                                      <input
                                        value={piece.plate}
                                        onChange={(event) =>
                                          updateProjectPiece(activeProject.id, piece.id, { plate: event.target.value })
                                        }
                                        placeholder="Placa"
                                        className="w-full min-w-0 rounded-lg border border-gray-200 px-2 py-1 text-xs"
                                      />
                                    </td>
                                    <td className="py-2 px-2">
                                      <select
                                        value={piece.status}
                                        onChange={(event) =>
                                          updateProjectPiece(activeProject.id, piece.id, {
                                            status: event.target.value as ProjectPieceStatus,
                                          })
                                        }
                                        className="w-full min-w-0 rounded-lg border border-gray-200 px-2 py-1 text-xs bg-white"
                                      >
                                        <option value="pendiente">Pendiente</option>
                                        <option value="impresa">Impresa</option>
                                        <option value="fallida">Fallida</option>
                                      </select>
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                      <button
                                        type="button"
                                        onClick={() => removeProjectPiece(activeProject.id, piece.id)}
                                        className="text-red-500 hover:text-red-600 text-xs font-semibold"
                                      >
                                        Quitar
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => duplicateProject(activeProject)}
                          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Duplicar proyecto
                        </button>
                        <button
                          type="button"
                          onClick={() => convertProjectToQuote(activeProject)}
                          className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
                        >
                          Convertir en cotización
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {!isProEnabled && (
                <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-white/70">
                  <div className="text-center px-6">
                    <p className="text-sm text-gray-600 mb-4">
                      Desbloqueá Proyectos PRO para gestionar impresiones multiparte.
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

        {activeSection === "wiki" && (
          <section className="max-w-6xl mx-auto mt-10">
            <WikiLayout isProEnabled={isProEnabled} onUnlockPro={() => handleOpenProModal("cta")} />
          </section>
        )}

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

              {canAdvancedMetrics && !hasProfitabilityData ? (
                <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-6 text-center text-sm text-gray-500">
                  Guardá tu primera cotización para ver el análisis.
                </div>
              ) : (
                <div className={`mt-6 space-y-6 ${canAdvancedMetrics ? "" : "blur-sm opacity-60 pointer-events-none"}`}>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 rounded-2xl border border-gray-200 p-5">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Ganancia total</p>
                      <p className="mt-2 text-2xl font-bold text-gray-800">
                        {canAdvancedMetrics ? formatCurrency(totalRentabilidadGanancia) : "—"}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl border border-gray-200 p-5">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Margen promedio</p>
                      <p className="mt-2 text-2xl font-bold text-gray-800">
                        {canAdvancedMetrics ? formatPercent(averageRentabilidadMargin) : "—"}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl border border-gray-200 p-5">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Producto más rentable</p>
                      <p className="mt-2 text-lg font-semibold text-gray-800">
                        {canAdvancedMetrics ? rentabilidadMostProfitable?.productName || "—" : "—"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {canAdvancedMetrics && rentabilidadMostProfitable
                          ? formatCurrency(rentabilidadMostProfitable.profit)
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-2xl border border-gray-200 p-5">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Top por ganancia</h3>
                      <div className="space-y-3 text-sm">
                        {(canAdvancedMetrics ? topByProfit : previewTopByProfit).map((item) => (
                          <div key={item.key} className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-800">{item.productName}</p>
                              <p className="text-xs text-gray-500">{item.category}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-800">
                                {canAdvancedMetrics ? formatCurrency(item.profit) : "—"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {canAdvancedMetrics ? formatPercent(item.margin) : "—"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl border border-gray-200 p-5">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Top por margen</h3>
                      <div className="space-y-3 text-sm">
                        {(canAdvancedMetrics ? topByMargin : previewTopByMargin).map((item) => (
                          <div key={item.key} className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-800">{item.productName}</p>
                              <p className="text-xs text-gray-500">{item.category}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-800">
                                {canAdvancedMetrics ? formatCurrency(item.profit) : "—"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {canAdvancedMetrics ? formatPercent(item.margin) : "—"}
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
                          {(canAdvancedMetrics ? recentQuotes : previewRecentQuotes).map((item) => (
                            <tr key={item.id} className="border-t border-gray-200">
                              <td className="py-2 text-gray-600">{item.date}</td>
                              <td className="py-2 font-semibold text-gray-800">{item.productName}</td>
                              <td className="py-2 text-gray-600">{item.category}</td>
                              <td className="py-2 text-right text-gray-700">
                                {canAdvancedMetrics ? formatCurrency(item.revenue) : "—"}
                              </td>
                              <td className="py-2 text-right text-gray-700">
                                {canAdvancedMetrics ? formatCurrency(item.profit) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {!canAdvancedMetrics && (
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

        {activeSection === "marketing" && (
          <section className="max-w-5xl mx-auto mt-10">
            <div className="bg-white rounded-3xl shadow-2xl p-8 relative">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Plan de acción</h2>
                  <p className="mt-2 text-sm text-gray-600">
                    Decisiones prácticas para organizar tu producción y vender mejor.
                  </p>
                </div>
                <span className="bg-purple-100 text-purple-600 text-xs font-semibold px-3 py-1 rounded-full">
                  PRO
                </span>
              </div>

              <div className={`mt-6 ${canAdvancedMetrics ? "" : "blur-sm opacity-60 pointer-events-none"}`}>
                <div className="grid lg:grid-cols-[1.4fr_0.8fr] gap-6">
                  <div className="space-y-6">
                    <div className="bg-slate-50 rounded-2xl border border-gray-200 p-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-700">Situación actual</h3>
                        <span className="text-xs text-gray-500">Estado operativo</span>
                      </div>
                      <div className="mt-4 grid md:grid-cols-3 gap-3">
                        <div className="rounded-xl bg-white border border-gray-200 p-3">
                          <p className="text-xs uppercase tracking-wide text-gray-500">Demanda</p>
                          <p className="mt-2 text-sm font-semibold text-gray-800">
                            {planSignals.demandStatus}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white border border-gray-200 p-3">
                          <p className="text-xs uppercase tracking-wide text-gray-500">Capacidad</p>
                          <p className="mt-2 text-sm font-semibold text-gray-800">
                            {planSignals.capacityStatus}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white border border-gray-200 p-3">
                          <p className="text-xs uppercase tracking-wide text-gray-500">Margen</p>
                          <p className="mt-2 text-sm font-semibold text-gray-800">
                            {planSignals.marginStatus}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-gray-500">
                        Estados estimados para tomar decisiones rápidas sin perder foco.
                      </p>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 p-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-700">Qué hacer ahora</h3>
                        <span className="text-xs text-gray-500">Prioridades</span>
                      </div>
                      <ul className="mt-4 space-y-2 text-sm">
                        {planActions.map((action) => (
                          <li key={action} className="flex items-start gap-2">
                            <span className="mt-2 h-2 w-2 rounded-full bg-blue-500" aria-hidden="true" />
                            <span className="text-gray-700">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 p-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-700">Decisiones sugeridas</h3>
                        <span className="text-xs text-gray-500">Checklist</span>
                      </div>
                      <ul className="mt-4 space-y-3 text-sm">
                        {planChecklist.map((item) => (
                          <li key={item} className="flex items-start gap-3">
                            <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                              <Check size={12} />
                            </span>
                            <span className="text-gray-700">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-slate-50 rounded-2xl border border-gray-200 p-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-700">Perfil de negocio</h3>
                        <span className="text-xs text-gray-500">Referencia</span>
                      </div>
                      <div className="mt-4 grid gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-2">Nombre de negocio</label>
                          <input
                            type="text"
                            value={marketingProfile.businessName}
                            onChange={(event) => handleMarketingProfileChange("businessName", event.target.value)}
                            placeholder="Ej: Taller 3D Norte"
                            className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-2">Enfoque principal</label>
                          <select
                            value={marketingProfile.focus}
                            onChange={(event) => handleMarketingProfileChange("focus", event.target.value)}
                            className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white"
                          >
                            <option value="">Seleccionar enfoque</option>
                            {MARKETING_FOCUS_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-2">Canal principal</label>
                          <select
                            value={marketingProfile.salesChannel}
                            onChange={(event) => handleMarketingProfileChange("salesChannel", event.target.value)}
                            className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white"
                          >
                            {MARKETING_CHANNEL_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-2">
                              Capacidad semanal
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={marketingProfile.weeklyCapacityHours}
                              onChange={(event) => handleMarketingProfileChange("weeklyCapacityHours", event.target.value)}
                              placeholder="Horas"
                              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-2">Margen objetivo</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={marketingProfile.targetMargin}
                              onChange={(event) => handleMarketingProfileChange("targetMargin", event.target.value)}
                              placeholder="%"
                              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-gray-500">
                        Se usa solo para ajustar las recomendaciones del plan.
                      </p>
                    </div>

                    {planAvoid.length > 0 && (
                      <div className="bg-white rounded-2xl border border-amber-200 p-5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-amber-900">En qué NO enfocarte ahora</h3>
                          <span className="text-xs text-amber-700">Reducir ruido</span>
                        </div>
                        <ul className="mt-4 space-y-2 text-sm text-amber-800">
                          {planAvoid.map((item) => (
                            <li key={item} className="flex items-start gap-2">
                              <span className="mt-2 h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {!canAdvancedMetrics && (
                <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-white/70">
                  <div className="text-center px-6">
                    <p className="text-sm text-gray-600 mb-4">
                      Desbloqueá Plan de acción PRO para tomar decisiones claras y accionables.
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

        {activeSection === "branding" && (
          <section className="max-w-5xl mx-auto mt-10">
            <div className="bg-white rounded-3xl shadow-2xl p-8 relative">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Branding</h2>
                  <p className="mt-2 text-sm text-gray-600">
                    Personalizá logo, nombre de negocio y estilo para PDFs y reportes.
                  </p>
                </div>
                <span className="bg-purple-100 text-purple-600 text-xs font-semibold px-3 py-1 rounded-full">
                  PRO
                </span>
              </div>

              <div
                className={`mt-6 grid md:grid-cols-2 gap-6 ${
                  canBranding ? "" : "blur-sm opacity-60 pointer-events-none"
                }`}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Nombre de negocio</label>
                    <input
                      type="text"
                      value={brand.name}
                      onChange={(event) => handleBrandChange("name", event.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Color primario</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={brand.primaryColor || "#5b9dff"}
                        onChange={(event) => handleBrandChange("primaryColor", event.target.value)}
                        className="h-10 w-16 rounded-lg border border-gray-200"
                      />
                      <input
                        type="text"
                        value={brand.primaryColor}
                        onChange={(event) => handleBrandChange("primaryColor", event.target.value)}
                        className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Texto del footer</label>
                    <input
                      type="text"
                      value={brand.footerText}
                      onChange={(event) => handleBrandChange("footerText", event.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">
                      Redes sociales (opcional)
                    </label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={brand.instagram}
                        onChange={(event) => handleBrandChange("instagram", event.target.value)}
                        placeholder="Instagram (ej: @tuusuario)"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={brand.whatsapp}
                        onChange={(event) => handleBrandChange("whatsapp", event.target.value)}
                        placeholder="WhatsApp (ej: +54 9 11 1234-5678)"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={brand.website}
                        onChange={(event) => handleBrandChange("website", event.target.value)}
                        placeholder="Sitio web (ej: tuweb.com)"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Logo (PNG/JPG)</label>
                    <input
                      type="file"
                      accept="image/png, image/jpeg"
                      onChange={handleLogoUpload}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                    {brand.logoDataUrl && (
                      <button
                        type="button"
                        onClick={() => handleBrandChange("logoDataUrl", "")}
                        className="mt-2 text-xs text-red-500 hover:text-red-600"
                      >
                        Quitar logo
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-slate-50 p-5">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Vista previa</p>
                  <div className="mt-4 flex items-center gap-3">
                    {brand.logoDataUrl ? (
                      <img
                        src={brand.logoDataUrl}
                        alt={brand.name || "Logo"}
                        className="h-12 w-12 rounded-xl object-contain bg-white"
                      />
                    ) : (
                      <div
                        className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: brand.primaryColor || "#5b9dff" }}
                      >
                        {brand.name?.trim().charAt(0) || "C"}
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-500">Marca</p>
                      <p className="text-lg font-semibold text-gray-800">{brand.name || "Costly3D"}</p>
                      {(brand.instagram || brand.whatsapp || brand.website) && (
                        <p className="text-xs text-gray-400">
                          {[brand.instagram, brand.whatsapp, brand.website].filter(Boolean).join(" • ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-white p-4 text-xs text-gray-500">
                    Color activo: <span className="font-semibold">{brand.primaryColor || "#5b9dff"}</span>
                    <br />
                    Footer: {brand.footerText || "—"}
                    {(brand.instagram || brand.whatsapp || brand.website) && (
                      <>
                        <br />
                        <span className="font-semibold">Redes:</span>{" "}
                        {[brand.instagram, brand.whatsapp, brand.website].filter(Boolean).join(" • ")}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {!canBranding && (
                <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-white/70">
                  <div className="text-center px-6">
                    <p className="text-sm text-gray-600 mb-4">
                      Desbloqueá Branding PRO para personalizar tus documentos.
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

        {activeSection === "settings" && (
          <section className="max-w-5xl mx-auto mt-10">
            <div className="rounded-3xl p-8 shadow-2xl bg-[color:var(--color-surface)] border border-[color:var(--color-border)]">
              <h2 className="text-2xl font-bold text-[color:var(--color-text)]">Configuracion</h2>
              <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
                Ajustes generales de la calculadora.
              </p>
              <div className="mt-6 grid gap-4">
                <div className="rounded-2xl border border-[color:var(--color-card-border)] bg-[color:var(--color-card-bg)] p-6 shadow-[var(--color-card-shadow)]">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-[color:var(--color-card-text)]">Modo oscuro</h3>
                      <p className="mt-1 text-sm text-[color:var(--color-card-text-muted)]">
                        Cambia la interfaz de la calculadora entre claro y oscuro.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isDarkMode}
                      onClick={handleToggleDarkMode}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full px-1 transition-colors ${
                        isDarkMode ? "bg-[color:var(--color-accent-strong)]" : "bg-[color:var(--color-border)]"
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-[color:var(--color-surface)] shadow-sm transition ${
                          isDarkMode ? "translate-x-6" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
                {devModeEnabled && (
                  <div className="rounded-2xl border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-card-bg)] p-6 shadow-[var(--color-card-shadow)]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-[color:var(--color-card-text)]">
                          DevTools
                        </h3>
                        <p className="mt-1 text-sm text-[color:var(--color-card-text-muted)]">
                          Acciones destructivas solo para desarrollo.
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-[color:var(--color-text-muted)]">
                        <AlertTriangle size={14} className="inline-block mr-1" />
                        DEV MODE ACTIVADO
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setDevResetTarget("seed")}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                      >
                        Cargar datos demo
                      </button>
                      <button
                        type="button"
                        onClick={() => setDevResetTarget("all")}
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 transition"
                      >
                        Reset all data
                      </button>
                      <button
                        type="button"
                        onClick={() => setDevResetTarget("stock")}
                        className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 hover:bg-orange-100 transition"
                      >
                        Reset stock
                      </button>
                      <button
                        type="button"
                        onClick={() => setDevResetTarget("quotes")}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                      >
                        Reset cotizaciones
                      </button>
                      <button
                        type="button"
                        onClick={() => setDevResetTarget("production")}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                      >
                        Reset producciones
                      </button>
                      <button
                        type="button"
                        onClick={() => setDevResetTarget("failed")}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                      >
                        Reset fallidas
                      </button>
                    </div>
                  </div>
                )}
                <div className="rounded-2xl border border-dashed border-[color:var(--color-border)] p-6 text-sm text-[color:var(--color-text-muted)]">
                  Seccion en construccion.
                </div>
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
                  ...(ENABLE_COMPARATOR
                    ? [
                        {
                          title: "Comparador de escenarios",
                          description: "Compará precios y márgenes antes de decidir.",
                          bullets: ["Variar material, tiempo y margen", "Elegí la opción más rentable"],
                          status: "En desarrollo",
                        },
                      ]
                    : []),
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
      {devResetTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={closeDevResetModal}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Confirmar reset de datos"
          >
            <h3 className="text-2xl font-bold text-gray-900">Confirmar reset</h3>
            <p className="mt-3 text-sm text-gray-600">
              Esta acción eliminará datos de forma permanente. No se puede deshacer.
            </p>
            <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
              {devResetTarget === "seed" && "Se borrarán los datos actuales y se cargarán los datos demo."}
              {devResetTarget === "all" && "Se borrarán todos los datos locales de la calculadora."}
              {devResetTarget === "stock" && "Se borrará todo el stock y los ajustes de inventario."}
              {devResetTarget === "quotes" && "Se eliminarán todas las cotizaciones (estado cotizada)."}
              {devResetTarget === "production" && "Se eliminarán todas las producciones en curso."}
              {devResetTarget === "failed" && "Se eliminarán todas las impresiones fallidas."}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={closeDevResetModal}
                className="bg-gray-100 text-gray-700 font-semibold px-5 py-3 rounded-xl hover:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={devResetTarget === "seed" ? loadDemoSeeds : runDevReset}
                className="bg-red-500 text-white font-semibold px-5 py-3 rounded-xl hover:bg-red-600 transition-all"
              >
                {devResetTarget === "seed" ? "Cargar datos demo" : "Confirmar reset"}
              </button>
            </div>
          </div>
        </div>
      )}
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
            aria-label="Pasar a producción"
          >
            <h3 className="text-2xl font-bold text-gray-900">Pasar a producción</h3>
            <p className="mt-3 text-sm text-gray-600">
              Esta acción mueve la cotización a producción para que puedas finalizarla o marcarla como fallida.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              <li>• Bloqueará la edición de la cotización</li>
              <li>• No descuenta filamento todavía</li>
              <li>• No impacta reportes hasta finalizar la impresión</li>
            </ul>
            <p className="mt-4 text-sm font-semibold text-red-500">
              Advertencia: esta acción no se puede deshacer.
            </p>
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
                Pasar a producción
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
            {stockModal.recordId && (
              <div className="mt-3 text-sm text-gray-700">
                <p className="font-semibold">Filamento actual</p>
                <p className="mt-1 text-xs text-gray-500">
                  {(() => {
                    const record = records.find((item) => item.id === stockModal.recordId);
                    if (!record) return "—";
                    const snapshot = resolveMaterialSnapshotFromRecord(record);
                    if (!snapshot) return "—";
                    return `${snapshot.materialType || "—"} · ${snapshot.colorName || "—"} · ${
                      snapshot.brandName || "—"
                    }`;
                  })()}
                </p>
              </div>
            )}
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
                  .filter((spool) => spool.gramsAvailable >= stockModal.required)
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
                    const record = records.find((item) => item.id === stockModal.recordId);
                    if (record) {
                      beginProduction(record, stockModal.selectedMaterialId);
                    }
                    setStockModal({
                      open: false,
                      available: 0,
                      required: 0,
                      recordId: null,
                      selectedMaterialId: "",
                    });
                  }}
                  className="bg-blue-500 text-white font-semibold px-5 py-3 rounded-xl hover:bg-blue-600 transition-all mr-3"
                >
                  Cambiar filamento y continuar
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
                  })
                }
                className="bg-blue-500 text-white font-semibold px-5 py-3 rounded-xl hover:bg-blue-600 transition-all"
              >
                Cancelar
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
      {failureDetailTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={closeFailureDetailModal}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Detalle de falla"
          >
            <h3 className="text-2xl font-bold text-gray-900">Detalle de falla</h3>
            <p className="mt-2 text-sm text-gray-600">
              {failureDetailTarget.productName || failureDetailTarget.name || "Producto"} · {failureDetailTarget.date}
            </p>

            {!canAdvancedMetrics ? (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-800">Detalle de fallas PRO</p>
                <p className="mt-2">
                  El detalle de fallas está disponible en PRO para mejorar tus procesos.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenProModal("cta")}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-all"
                >
                  <Lock size={14} />
                  Acceso anticipado PRO
                </button>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {(() => {
                  const failure = failureDetailTarget.failure;
                  if (!failure) {
                    return (
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                        No hay detalle de falla registrado para este item.
                      </div>
                    );
                  }
                  const percentPrinted =
                    typeof failure.percentPrinted === "number" ? failure.percentPrinted : 0;
                  const lostGrams =
                    typeof failure.lostGrams === "number"
                      ? failure.lostGrams
                      : typeof failure.gramsLost === "number"
                        ? failure.gramsLost
                        : 0;
                  const lostCost =
                    typeof failure.lostCost === "number"
                      ? failure.lostCost
                      : (failure.materialCostLost ?? 0) + (failure.energyCostLost ?? 0);
                  const reason = failure.reason ?? failure.note ?? "Sin comentario";

                  return (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-gray-200 bg-white p-4">
                          <p className="text-[11px] uppercase tracking-wide text-gray-400">
                            Porcentaje impreso
                          </p>
                          <p className="mt-2 text-lg font-semibold text-gray-900">
                            {percentPrinted.toFixed(0)}%
                          </p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-white p-4">
                          <p className="text-[11px] uppercase tracking-wide text-gray-400">Filamento perdido</p>
                          <p className="mt-2 text-lg font-semibold text-gray-900">
                            {lostGrams.toFixed(0)} g
                          </p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-white p-4">
                          <p className="text-[11px] uppercase tracking-wide text-gray-400">Costo perdido</p>
                          <p className="mt-2 text-lg font-semibold text-gray-900">
                            {formatCurrency(lostCost)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-white p-4">
                          <p className="text-[11px] uppercase tracking-wide text-gray-400">Estado</p>
                          <p className="mt-2 text-lg font-semibold text-red-500">Fallida</p>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Motivo</p>
                        <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">{reason}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={closeFailureDetailModal}
                className="bg-gray-100 text-gray-700 font-semibold px-5 py-3 rounded-xl hover:bg-gray-200 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;



