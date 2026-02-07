const defaultCafecito = "https://cafecito.app/costly3d";

export const CAFECITO_URL = import.meta.env.VITE_CAFECITO_URL?.trim?.() || defaultCafecito;
