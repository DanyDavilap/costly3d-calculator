## Calculadora 3D – Admin Privado

Este proyecto es una aplicación administrativa white-label construida con React + Vite. Calcula costos de impresión 3D y almacena los registros localmente, lista para conectarse a tus APIs internas.

### Estructura principal

```
src
├── assets/brand       # Logos y temas por cliente (JSON + SVG)
├── components
│   ├── layout         # NavbarPrivada, Sidebar, FooterPrivado
│   └── ui             # Botones, cards y patrones reutilizables
├── hooks              # Hooks compartidos
├── pages
│   ├── Dashboard      # Calculadora original (lógica intacta)
│   ├── Login          # Acceso privado (demo)
│   ├── Items / Faltantes / Reportes / Configuracion
├── routes             # router.tsx con guardas
├── services           # auth.ts y futuros servicios externos
├── store              # reservado
└── styles             # tokens.css, theme.css, index.css
```

### Brand / White-label
1. Duplica `src/assets/brand/default.json` y su SVG asociado.
2. Ajusta `colors` y `logo`.
3. Define `VITE_BRAND=nombreNuevo` en `.env`.
4. `brand-loader.ts` aplicará las variables al DOM.

### Variables de entorno

```
VITE_BRAND=default
```

### Comandos

```
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
```

### Notas
- La lógica de negocio de la calculadora se mantiene en `pages/Dashboard/Dashboard.tsx`.
- El login es ilustrativo: conecta tu servicio real para ambientes productivos.
- La aplicación es privada; detrás de las rutas protegidas se controla con localStorage hasta integrar autenticación corporativa.
