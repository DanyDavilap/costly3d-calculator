import {
  COLOMBIA_REGIONAL_CONFIG,
  LEGACY_ARGENTINA_REGIONAL_CONFIG,
  type SupportedCountry,
  type SupportedCurrency,
} from "../config/regional";
import {
  CALCULATION_MODEL_VERSION,
  FINANCIAL_SCHEMA_VERSION,
  type CostEngineV2Result,
} from "../core/financialEngineV2";

export const LEGACY_SCHEMA_VERSION = 1 as const;
export const LEGACY_CALCULATION_MODEL_VERSION = "legacy-v1" as const;
export const LEGACY_REGIONAL_TAG = "legacy-ARS" as const;

export type FinancialRecordMetadata = {
  schemaVersion: typeof LEGACY_SCHEMA_VERSION | typeof FINANCIAL_SCHEMA_VERSION;
  calculationModelVersion:
    | typeof LEGACY_CALCULATION_MODEL_VERSION
    | typeof CALCULATION_MODEL_VERSION;
  currency: SupportedCurrency;
  locale: string;
  country: SupportedCountry;
  regionalTag?: typeof LEGACY_REGIONAL_TAG;
};

export type VersionedFinancialRecord = FinancialRecordMetadata & {
  financialSnapshot?: CostEngineV2Result;
};

type UnknownRecord = Record<string, unknown>;

export const createLegacyFinancialMetadata = (): FinancialRecordMetadata => ({
  schemaVersion: LEGACY_SCHEMA_VERSION,
  calculationModelVersion: LEGACY_CALCULATION_MODEL_VERSION,
  currency: LEGACY_ARGENTINA_REGIONAL_CONFIG.currency,
  locale: LEGACY_ARGENTINA_REGIONAL_CONFIG.locale,
  country: LEGACY_ARGENTINA_REGIONAL_CONFIG.country,
  regionalTag: LEGACY_REGIONAL_TAG,
});

export const createV2FinancialMetadata = (): FinancialRecordMetadata => ({
  schemaVersion: FINANCIAL_SCHEMA_VERSION,
  calculationModelVersion: CALCULATION_MODEL_VERSION,
  currency: COLOMBIA_REGIONAL_CONFIG.currency,
  locale: COLOMBIA_REGIONAL_CONFIG.locale,
  country: COLOMBIA_REGIONAL_CONFIG.country,
});

export const isV2FinancialRecord = (record: Partial<VersionedFinancialRecord>) =>
  record.schemaVersion === FINANCIAL_SCHEMA_VERSION &&
  record.calculationModelVersion === CALCULATION_MODEL_VERSION &&
  record.currency === "COP";

export const isLegacyFinancialRecord = (record: Partial<VersionedFinancialRecord>) =>
  !isV2FinancialRecord(record);

export const withFinancialVersionForRead = <T extends UnknownRecord>(
  record: T,
): T & VersionedFinancialRecord => {
  if (
    record.schemaVersion === FINANCIAL_SCHEMA_VERSION &&
    record.calculationModelVersion === CALCULATION_MODEL_VERSION &&
    record.currency === "COP"
  ) {
    return {
      ...record,
      ...createV2FinancialMetadata(),
      financialSnapshot: record.financialSnapshot as CostEngineV2Result | undefined,
    };
  }

  return {
    ...record,
    ...createLegacyFinancialMetadata(),
    financialSnapshot: undefined,
  };
};

