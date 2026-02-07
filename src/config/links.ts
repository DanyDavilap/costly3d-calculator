const defaultCafecito = "TU_LINK_DE_CAFECITO";

export const CAFECITO_URL = import.meta.env.VITE_CAFECITO_URL?.trim?.() || defaultCafecito;
