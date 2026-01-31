
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { jsPDF } from "jspdf";
import { track } from "@vercel/analytics";
import { debugTrack } from "../../components/DebugAnalyticsPanel";
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
  Copy,
  Lock,
  Download,
  Sparkles,
  Rocket,
} from "lucide-react";
import {
  pricingCalculator,
  PricingBreakdown,
  PricingInputs,
  PricingParams,
} from "../../utils/pricingCalculator";

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
  quantity: number;
  status: "draft" | "sold";
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

const PARAMS_STORAGE_KEY = "calculatorBaseParams";
const HISTORY_STORAGE_KEY = "toyRecords";
const STOCK_STORAGE_KEY = "stockByProduct";
const CATEGORY_STORAGE_KEY = "calculatorCategory";
const FREE_PRODUCT_LIMIT = 3;
const IS_PRO_SANDBOX = false;
const BRAND_COLOR = { r: 91, g: 157, b: 255 };
const FREE_LIMIT_EVENT_KEY = "costly3d_free_limit_reached_v1";

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
    const available = record.status === "sold" ? 0 : record.quantity || 0;
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
  const status =
    raw.status ?? ((raw as unknown as { sold?: boolean }).sold ? "sold" : "draft");
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
    quantity,
    status,
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

function Dashboard() {
  const [activeTab, setActiveTab] = useState<"calculator" | "history">("calculator");
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
  const [params, setParams] = useState<PricingParams>(loadStoredParams);

  const [result, setResult] = useState<PricingResult | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const isCalculatingRef = useRef(false);
  const lastSavedSignatureRef = useRef<string | null>(null);
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const waitlistTimerRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem(PARAMS_STORAGE_KEY, JSON.stringify(params));
  }, [params]);

  useEffect(() => {
    localStorage.setItem(CATEGORY_STORAGE_KEY, category.trim() || "General");
  }, [category]);

  useEffect(() => {
    if (!isProModalOpen) return;
    let alreadyTracked = false;
    try {
      alreadyTracked = sessionStorage.getItem(FREE_LIMIT_EVENT_KEY) === "1";
    } catch (error) {
      alreadyTracked = false;
    }
    if (alreadyTracked) return;
    if (import.meta.env.DEV) {
      debugTrack("free_limit_reached", { source: "free_limit_modal" });
    }
    track("free_limit_reached", { source: "free_limit_modal" });
    try {
      sessionStorage.setItem(FREE_LIMIT_EVENT_KEY, "1");
    } catch (error) {
      // Ignore storage errors to avoid blocking the flow.
    }
  }, [isProModalOpen]);

  const isFreeLimitReached = records.length >= FREE_PRODUCT_LIMIT;

  const buildRecordSignature = (inputs: PricingInputs, paramsSnapshot: PricingParams) =>
    JSON.stringify({
      name: toyName.trim() || "Sin nombre",
      category: category.trim() || "General",
      inputs,
      params: paramsSnapshot,
    });

  const persistHistory = (
    newRecords: HistoryRecord[],
    options?: {
      signature?: string;
      allowDuplicateSignature?: boolean;
    }
  ) => {
    // Single source of truth: history persistence + free-limit checks live only here.
    const isGrowing = newRecords.length > records.length;
    if (isGrowing && records.length >= FREE_PRODUCT_LIMIT) {
      // Mostrar modal PRO cuando el límite FREE impide guardar un nuevo producto.
      setIsProModalOpen(true);
      return;
    }
    if (isGrowing && options?.signature && !options.allowDuplicateSignature) {
      if (options.signature === lastSavedSignatureRef.current) {
        return;
      }
    }
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newRecords));
    localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(buildStockMap(newRecords)));
    setRecords(newRecords);
    if (isGrowing && options?.signature && !options.allowDuplicateSignature) {
      lastSavedSignatureRef.current = options.signature;
    }
  };

  const closeWaitlistModal = () => {
    if (waitlistTimerRef.current) {
      window.clearTimeout(waitlistTimerRef.current);
      waitlistTimerRef.current = null;
    }
    setIsWaitlistOpen(false);
    setWaitlistSuccess(false);
    setWaitlistEmail("");
  };

  const openWaitlistModal = () => {
    console.log("PRO_WAITLIST_OPEN");
    setIsWaitlistOpen(true);
  };

  const submitWaitlistEmail = () => {
    const email = waitlistEmail.trim();
    if (!email.includes("@")) return;

    console.log("PRO_WAITLIST_SUBMIT", email);
    const key = "costly3d_pro_waitlist";
    let stored: string[] = [];
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        stored = parsed;
      } else if (typeof parsed === "string" && parsed) {
        stored = [parsed];
      }
    } catch (error) {
      stored = [];
    }

    if (!stored.includes(email)) {
      stored.push(email);
      localStorage.setItem(key, JSON.stringify(stored));
    }

    void fetch("https://docs.google.com/forms/d/e/1FAIpQLSckMvV_judFYw4r5OY_2Rbf8miQAUVwbKXqosMuW41G1qVzKQ/formResponse", {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "entry.1838115511": email,
      }),
    });

    const domain = email.split("@")[1]?.toLowerCase() || "unknown";
    if (import.meta.env.DEV) {
      debugTrack("pro_email_submitted", {
        source: "free_limit_modal",
        has_email: true,
        email_domain: domain,
      });
    }
    track("pro_email_submitted", {
      source: "free_limit_modal",
      has_email: true,
      email_domain: domain,
    });
    console.log("PRO_WAITLIST_SUCCESS");
    setWaitlistSuccess(true);

    if (waitlistTimerRef.current) {
      window.clearTimeout(waitlistTimerRef.current);
    }
    waitlistTimerRef.current = window.setTimeout(() => {
      closeWaitlistModal();
    }, 2000);
  };

  const buildPdfDataFromResult = () => {
    if (!result) return null;
    const productName = toyName || "Producto";
    const categoryName = category.trim() || "General";
    return {
      productName,
      categoryName,
      dateLabel: new Date().toLocaleDateString("es-AR"),
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
    dateLabel: record.date || new Date().toLocaleDateString("es-AR"),
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
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageMargin = 16;
    const rightEdge = pageWidth - pageMargin;
    let cursorY = 24;
    const lineGap = 7;
    const lightDivider = () => {
      doc.setDrawColor(BRAND_COLOR.r, BRAND_COLOR.g, BRAND_COLOR.b);
      doc.setLineWidth(0.4);
      doc.line(pageMargin, cursorY, rightEdge, cursorY);
      cursorY += 8;
    };

    const clientBreakdown = [
      { label: "Materiales", value: breakdown.materiales },
      { label: "Consumo energético", value: breakdown.energia },
      { label: "Mano de obra", value: breakdown.manoDeObra },
      { label: "Uso y mantenimiento de equipo", value: breakdown.usoYMantenimiento },
    ];

    doc.setFillColor(BRAND_COLOR.r, BRAND_COLOR.g, BRAND_COLOR.b);
    doc.roundedRect(pageMargin, 16, 22, 22, 5, 5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("C3D", pageMargin + 6, 30);

    doc.setTextColor(BRAND_COLOR.r, BRAND_COLOR.g, BRAND_COLOR.b);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Cotización de producto", pageMargin + 30, 30);
    cursorY = 46;
    lightDivider();

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text(`Producto: ${productName}`, pageMargin, cursorY);
    cursorY += lineGap;
    doc.text(`Categoría: ${categoryName}`, pageMargin, cursorY);
    cursorY += lineGap;
    doc.text(`Fecha: ${dateLabel}`, pageMargin, cursorY);
    cursorY += 6;
    lightDivider();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Desglose", pageMargin, cursorY);
    cursorY += lineGap;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    clientBreakdown.forEach((item) => {
      doc.text(item.label, pageMargin, cursorY);
      doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(item.value), rightEdge, cursorY, { align: "right" });
      doc.setFont("helvetica", "normal");
      cursorY += lineGap;
    });
    cursorY += 2;
    lightDivider();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(BRAND_COLOR.r, BRAND_COLOR.g, BRAND_COLOR.b);
    doc.text("TOTAL FINAL SUGERIDO", pageMargin, cursorY);
    doc.setFontSize(18);
    doc.text(formatCurrency(breakdown.total), rightEdge, cursorY + 1, { align: "right" });
    cursorY += 12;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Cotización generada con Costly3D", pageMargin, pageHeight - 16);

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
  }): HistoryRecord => ({
    id: recordId ?? Date.now().toString(),
    date: new Date().toLocaleDateString("es-AR"),
    name: toyName || "Sin nombre",
    productName: toyName || "Sin nombre",
    category: category.trim() || "General",
    inputs,
    params: paramsSnapshot,
    breakdown,
    total: breakdown.finalPrice,
    quantity: 1,
    status: "draft",
    stockChanges: [],
  });

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
  }) => {
    if (mode === "update" && editingRecordId) {
      let updated = false;
      const nextRecords = records.map((record) => {
        if (record.id !== editingRecordId) return record;
        updated = true;
        return {
          ...record,
          name: toyName || record.name,
          productName: toyName || record.productName || record.name,
          category,
          inputs,
          params: paramsSnapshot,
          breakdown,
          total: breakdown.finalPrice,
        };
      });
      if (updated) {
        persistHistory(nextRecords);
        return;
      }
    }

    const newRecord = buildRecord({ inputs, breakdown, paramsSnapshot });
    const signature = buildRecordSignature(inputs, paramsSnapshot);
    persistHistory([newRecord, ...records], { signature });
    setEditingRecordId(null);
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
    if (!inputs) return;
    if (!isValidInputs(inputs) || !isValidParams(params)) return;

    const breakdown = pricingCalculator({ inputs, params });
    if (!isValidBreakdown(breakdown)) return;
    setResult({ timeMinutes: inputs.timeMinutes, materialGrams: inputs.materialGrams, breakdown });
    saveCalculation({
      inputs,
      breakdown,
      paramsSnapshot: params,
      mode: editingRecordId ? "update" : "create",
    });
    if (!editingRecordId) {
      clearFields();
    }
  };

  const clearFields = () => {
    setToyName("");
    setPrintHours("");
    setPrintMinutes("");
    setAssemblyHours("");
    setAssemblyMinutes("");
    setMaterialWeight("");
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
      "Tiempo (min)",
      "Material (g)",
      "Costo Total",
      "Precio Venta",
      "Ganancia",
    ];
    const rows = records.map((r) => [
      r.date,
      r.name,
      r.category,
      r.inputs.timeMinutes.toFixed(0),
      r.inputs.materialGrams.toFixed(0),
      r.breakdown.totalCost.toFixed(0),
      r.breakdown.finalPrice.toFixed(0),
      r.breakdown.profit.toFixed(0),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historial-productos-${Date.now()}.csv`;
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

  const handleParamChange = <K extends keyof PricingParams>(key: K, value: string) => {
    const numericValue = parseFloat(value);
    setParams((prev) => ({
      ...prev,
      [key]: Number.isNaN(numericValue) ? 0 : numericValue,
    }));
  };

  const openRecord = (record: HistoryRecord) => {
    setToyName(record.name);
    setCategory(record.category.trim() || "General");
    setPrintHours(toFixedString(Math.floor(record.inputs.timeMinutes / 60)));
    setPrintMinutes(toFixedString(Math.round(record.inputs.timeMinutes % 60)));
    setAssemblyHours(toFixedString(Math.floor(record.inputs.assemblyMinutes / 60)));
    setAssemblyMinutes(toFixedString(Math.round(record.inputs.assemblyMinutes % 60)));
    setMaterialWeight(toFixedString(record.inputs.materialGrams));
    setParams(record.params);
    setResult({
      timeMinutes: record.inputs.timeMinutes,
      materialGrams: record.inputs.materialGrams,
      breakdown: record.breakdown,
    });
    setEditingRecordId(record.id);
    setActiveTab("calculator");
  };

  const duplicateRecord = (record: HistoryRecord) => {
    const duplicated: HistoryRecord = {
      ...record,
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("es-AR"),
      status: "draft",
      stockChanges: [],
    };
    persistHistory([duplicated, ...records], { allowDuplicateSignature: true });
  };

  const deleteRecord = (record: HistoryRecord) => {
    if (!confirm("¿Eliminar este producto del historial?")) return;
    const nextRecords = records.filter((item) => item.id !== record.id);
    persistHistory(nextRecords);
    if (editingRecordId === record.id) {
      clearFields();
    }
  };

  const toggleSold = (record: HistoryRecord) => {
    const stockMap = buildStockMap(records);
    const key = getProductKey(record.name, record.category);
    const currentStock = stockMap[key] ?? 0;
    const nextSold = record.status !== "sold";
    const change = nextSold ? -record.quantity : record.quantity;
    const nextStock = currentStock + change;

    if (nextStock < 0) {
      alert("Stock insuficiente para marcar como vendido.");
      return;
    }

    const now = new Date().toISOString();
    const stockChange: StockChange = {
      date: now,
      timestamp: now,
      change,
      stockAfter: nextStock,
      reason: nextSold ? "sold" : "restock",
      type: nextSold ? "sale" : "restock",
    };

    const nextRecords = records.map((item) => {
      if (item.id !== record.id) return item;
      return {
        ...item,
        status: nextSold ? "sold" : "draft",
        stockChanges: [...item.stockChanges, stockChange],
      };
    });

    persistHistory(nextRecords);
  };

  const totalToys = records.length;
  const totalHours = records.reduce((sum, r) => sum + r.inputs.timeMinutes, 0) / 60;
  const totalProfit = records.reduce((sum, r) => sum + r.breakdown.profit, 0);
  const mostProfitable =
    records.length > 0
      ? records.reduce((max, r) => (r.breakdown.profit > max.breakdown.profit ? r : max), records[0])
      : null;

  const categoryData = records.reduce((acc: { category: string; profit: number }[], record) => {
    const existing = acc.find((item) => item.category === record.category);
    if (existing) {
      existing.profit += record.breakdown.profit;
    } else {
      acc.push({ category: record.category, profit: record.breakdown.profit });
    }
    return acc;
  }, []);

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

        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-full p-1 shadow-lg flex gap-2">
            <button
              onClick={() => setActiveTab("calculator")}
              className={`px-6 py-3 rounded-full font-semibold transition-all flex items-center gap-2 ${
                activeTab === "calculator" ? "bg-blue-500 text-white shadow-md" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Calculator size={20} />
              Calculadora
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-6 py-3 rounded-full font-semibold transition-all flex items-center gap-2 ${
                activeTab === "history" ? "bg-blue-500 text-white shadow-md" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <History size={20} />
              Historial
            </button>
          </div>
        </div>
        <AnimatePresence mode="wait">
          {activeTab === "calculator" ? (
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
                      onChange={(e) => setMaterialWeight(e.target.value)}
                      placeholder="ej. 142"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                    />
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
                        onClick={saveResult}
                        disabled={!result}
                        className="flex-1 bg-white text-blue-600 font-bold py-3 rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save size={20} />
                        Guardar resultado
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

              {categoryData.length > 0 && (
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

              <div className="bg-white rounded-3xl shadow-2xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <History size={28} className="text-blue-500" />
                    Historial de Productos
                  </h2>
                  <div className="flex gap-3">
                    <button
                      onClick={exportToCSV}
                      disabled={records.length === 0}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      <Download size={18} />
                      Exportar CSV
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
                </div>

                {records.length === 0 ? (
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
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((record, index) => (
                          <motion.tr
                            key={record.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={(event) => {
                              // Historial shortcut: Alt + click = duplicar cálculo.
                              if (event.altKey) {
                                duplicateRecord(record);
                                return;
                              }
                              // Historial shortcut: Shift + click = marcar/desmarcar como vendido (ajusta stock).
                              if (event.shiftKey) {
                                toggleSold(record);
                                return;
                              }
                              // Historial shortcut: click = abrir para ver/editar.
                              openRecord(record);
                            }}
                          >
                            <td className="py-4 px-4 text-gray-600">{record.date}</td>
                            <td className="py-4 px-4 font-semibold text-gray-800">{record.name}</td>
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
                              {formatCurrency(record.breakdown.finalPrice)}
                            </td>
                            <td className="py-4 px-4 text-right text-green-600 font-semibold">
                              {formatCurrency(record.breakdown.profit)}
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
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    duplicateRecord(record);
                                  }}
                                  className="inline-flex items-center justify-center rounded-full p-2 text-blue-500 hover:bg-blue-50 transition-colors"
                                  aria-label="Duplicar producto"
                                  title="Duplicar producto"
                                >
                                  <Copy size={18} />
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
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <section className="max-w-5xl mx-auto mt-10">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Funciones PRO (próximamente)</h2>
              <span className="bg-purple-100 text-purple-600 text-xs font-semibold px-3 py-1 rounded-full">PRO</span>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  title: "Análisis de rentabilidad",
                  description: "Visualiza ganancia neta, margen real y ranking de productos.",
                },
                {
                  title: "Costos fijos y amortización",
                  description: "Distribuye alquiler, mantenimiento y desgaste de máquina.",
                },
                {
                  title: "Exportar cotizaciones",
                  description: "Descarga presupuestos en PDF o Excel listos para clientes.",
                },
                {
                  title: "Historial ilimitado",
                  description: "Guarda versiones y evoluciona tus precios sin límites.",
                },
                {
                  title: "Comparador de escenarios",
                  description: "Compara materiales, tiempos y márgenes antes de decidir.",
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
                      <h3 className="text-base font-semibold text-gray-800 mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-600">{item.description}</p>
                      <span className="inline-flex mt-3 text-xs text-slate-500">Disponible en versión PRO</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      {isProModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setIsProModalOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Información sobre versión PRO"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Tu negocio 3D está creciendo</h2>
                <p className="mt-3 text-sm text-gray-600">
                  Ya alcanzaste el límite de 3 productos en la versión gratuita de Costly3D.
                </p>
                <p className="mt-3 text-sm text-gray-600">
                  La versión PRO está pensada para makers y talleres que quieren dejar de improvisar precios y empezar
                  a escalar con claridad.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsProModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <ul className="mt-5 space-y-2 text-sm text-gray-700">
              <li>Historial de productos ilimitado</li>
              <li>Cotizaciones profesionales en PDF / Excel</li>
              <li>Análisis real de rentabilidad por producto</li>
              <li>Control avanzado de stock y categorías</li>
              <li>Comparador de escenarios antes de vender</li>
            </ul>

            <p className="mt-5 text-sm font-medium text-gray-700">
              Si ya estás vendiendo, Costly3D PRO te ahorra errores, tiempo y dinero.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="bg-gradient-to-r from-blue-500 to-green-500 text-white font-semibold px-5 py-3 rounded-xl hover:from-blue-600 hover:to-green-600 transition-all"
                onClick={() => {
                  console.log("CTA_PRO_CLICK");
                  if (import.meta.env.DEV) {
                    debugTrack("pro_cta_click", { source: "free_limit_modal" });
                  }
                  track("pro_cta_click", { source: "free_limit_modal" });
                  setIsProModalOpen(false);
                  openWaitlistModal();
                }}
              >
                Acceso anticipado PRO
              </button>
              <button
                type="button"
                className="bg-gray-100 text-gray-700 font-semibold px-5 py-3 rounded-xl hover:bg-gray-200 transition-all"
                onClick={() => setIsProModalOpen(false)}
              >
                Seguir probando (solo lectura)
              </button>
            </div>
          </div>
        </div>
      )}
      {isWaitlistOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={closeWaitlistModal}
        >
          <div
            className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Acceso anticipado a Costly3D PRO"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Acceso anticipado a Costly3D PRO</h2>
                <p className="mt-3 text-sm text-gray-600">
                  Costly3D PRO está diseñado para makers y talleres que ya venden y quieren controlar sus costos con
                  claridad.
                </p>
                <p className="mt-3 text-sm text-gray-600">Estamos habilitando el acceso de forma gradual.</p>
              </div>
              <button
                type="button"
                onClick={closeWaitlistModal}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {waitlistSuccess ? (
              <div className="mt-6 rounded-2xl bg-green-50 border border-green-100 p-4 text-green-700 text-sm font-medium">
                ¡Listo! Te avisaremos cuando Costly3D PRO esté disponible.
              </div>
            ) : (
              <>
                <div className="mt-5">
                  <input
                    type="email"
                    value={waitlistEmail}
                    onChange={(event) => setWaitlistEmail(event.target.value)}
                    placeholder="Tu email de trabajo"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="bg-gradient-to-r from-blue-500 to-green-500 text-white font-semibold px-5 py-3 rounded-xl hover:from-blue-600 hover:to-green-600 transition-all"
                    onClick={submitWaitlistEmail}
                  >
                    Quiero acceso PRO
                  </button>
                  <button
                    type="button"
                    className="bg-gray-100 text-gray-700 font-semibold px-5 py-3 rounded-xl hover:bg-gray-200 transition-all"
                    onClick={closeWaitlistModal}
                  >
                    Seguir probando (solo lectura)
                  </button>
                </div>
                <p className="mt-4 text-xs text-gray-500">
                  No enviamos spam. Te avisaremos cuando PRO esté disponible.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
