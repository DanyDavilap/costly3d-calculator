export type SupportedCountry = "CO" | "AR";
export type SupportedCurrency = "COP" | "ARS";

export type RegionalConfig = {
  country: SupportedCountry;
  currency: SupportedCurrency;
  locale: string;
  timeZone: string;
  moneyFractionDigits: number;
};

export const COLOMBIA_REGIONAL_CONFIG: RegionalConfig = Object.freeze({
  country: "CO",
  currency: "COP",
  locale: "es-CO",
  timeZone: "America/Bogota",
  moneyFractionDigits: 0,
});

export const LEGACY_ARGENTINA_REGIONAL_CONFIG: RegionalConfig = Object.freeze({
  country: "AR",
  currency: "ARS",
  locale: "es-AR",
  timeZone: "America/Argentina/Buenos_Aires",
  moneyFractionDigits: 0,
});

export const getRegionalConfigForCurrency = (
  currency: SupportedCurrency,
): RegionalConfig =>
  currency === "ARS" ? LEGACY_ARGENTINA_REGIONAL_CONFIG : COLOMBIA_REGIONAL_CONFIG;

type MoneyFormatOptions = {
  config?: RegionalConfig;
  currency?: SupportedCurrency;
  includeCurrencyCode?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

const normalizeSpaces = (value: string) => value.replace(/[\u00a0\u202f]/g, " ");

export const formatMoney = (value: number, options: MoneyFormatOptions = {}) => {
  const config = options.config ??
    (options.currency
      ? getRegionalConfigForCurrency(options.currency)
      : COLOMBIA_REGIONAL_CONFIG);
  const currency = options.currency ?? config.currency;
  const fractionDigits = config.moneyFractionDigits;

  return normalizeSpaces(
    new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency,
      currencyDisplay: options.includeCurrencyCode ? "code" : "narrowSymbol",
      minimumFractionDigits: options.minimumFractionDigits ?? fractionDigits,
      maximumFractionDigits: options.maximumFractionDigits ?? fractionDigits,
    }).format(value),
  );
};

export const formatNumber = (
  value: number,
  options: Intl.NumberFormatOptions = {},
  config: RegionalConfig = COLOMBIA_REGIONAL_CONFIG,
) => normalizeSpaces(new Intl.NumberFormat(config.locale, options).format(value));

export const formatPercent = (
  value: number,
  options: Intl.NumberFormatOptions = {},
  config: RegionalConfig = COLOMBIA_REGIONAL_CONFIG,
) =>
  normalizeSpaces(
    new Intl.NumberFormat(config.locale, {
      style: "percent",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...options,
    }).format(value / 100),
  );

export const formatDate = (
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions = {},
  config: RegionalConfig = COLOMBIA_REGIONAL_CONFIG,
) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(config.locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: config.timeZone,
    ...options,
  }).format(date);
};

