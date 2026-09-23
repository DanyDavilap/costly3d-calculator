import type { SupportedCurrency } from "../config/regional";

export type PaymentStatus = "pending" | "partial" | "paid" | "refunded" | "cancelled";

export type Sale = {
  id: string;
  productionId?: string;
  quoteId?: string;
  date: string;
  quantity: number;
  unitPrice: number;
  grossRevenue: number;
  discount: number;
  fees: number;
  shippingCharged: number;
  shippingCost: number;
  taxes: number;
  netRevenue: number;
  costAssociated: number;
  actualProfit: number;
  actualMarginPercent: number;
  currency: SupportedCurrency;
  paymentStatus: PaymentStatus;
  schemaVersion: 1;
  calculationModelVersion: "sale-v1";
  createdAt: string;
  updatedAt: string;
};
