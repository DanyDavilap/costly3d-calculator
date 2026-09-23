import type { Sale } from "../domain/sales";
import { FinancialValidationError } from "./financialEngineV2";

export type RegisterSaleInput = {
  id: string;
  productionId?: string;
  quoteId?: string;
  date: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  fees?: number;
  shippingCost?: number;
  associatedUnitCost: number;
  createdAt?: string;
};

const validateMoney = (value: number, label: string, issues: string[]) => {
  if (!Number.isFinite(value) || value < 0) issues.push(`${label} debe ser un número no negativo.`);
};

export const registerSale = (input: RegisterSaleInput): Sale => {
  const issues: string[] = [];
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    issues.push("La cantidad vendida debe ser un entero mayor que cero.");
  }
  validateMoney(input.unitPrice, "El precio unitario", issues);
  validateMoney(input.discount ?? 0, "El descuento", issues);
  validateMoney(input.fees ?? 0, "La comisión", issues);
  validateMoney(input.shippingCost ?? 0, "El costo de envío", issues);
  validateMoney(input.associatedUnitCost, "El costo asociado", issues);
  if (!input.date.trim()) issues.push("La venta debe tener fecha.");
  if (issues.length > 0) throw new FinancialValidationError(issues);

  const grossRevenue = input.unitPrice * input.quantity;
  const discount = input.discount ?? 0;
  const fees = input.fees ?? 0;
  const shippingCost = input.shippingCost ?? 0;
  const netRevenue = grossRevenue - discount - fees - shippingCost;
  const costAssociated = input.associatedUnitCost * input.quantity;
  const actualProfit = netRevenue - costAssociated;
  const actualMarginPercent = netRevenue > 0 ? (actualProfit / netRevenue) * 100 : 0;
  const createdAt = input.createdAt ?? new Date().toISOString();

  return {
    id: input.id,
    productionId: input.productionId,
    quoteId: input.quoteId,
    date: input.date,
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    grossRevenue,
    discount,
    fees,
    shippingCharged: 0,
    shippingCost,
    taxes: 0,
    netRevenue,
    costAssociated,
    actualProfit,
    actualMarginPercent,
    currency: "COP",
    paymentStatus: "paid",
    schemaVersion: 1,
    calculationModelVersion: "sale-v1",
    createdAt,
    updatedAt: createdAt,
  };
};

